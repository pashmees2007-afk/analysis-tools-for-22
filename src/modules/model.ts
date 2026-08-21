import { fileURLToPath } from "node:url";
import * as ort from "onnxruntime-node";
import sharp from "sharp";
import type { ModelAnalysisResult, ModelMetadata, TerrainClassCoverage } from "../contracts.js";

const INPUT_SIZE = 256;
const MODEL_PATH = fileURLToPath(new URL("../models/mobilenetv3_unet_v1.onnx", import.meta.url));
const IMAGE_MEAN = [0.485, 0.456, 0.406] as const;
const IMAGE_STD = [0.229, 0.224, 0.225] as const;

export const MODEL_METADATA: ModelMetadata = {
  version: "ai4mars-msl-mobilenetv3-unet-v1",
  label: "MobileNetV3-Small U-Net semantic terrain segmenter",
  inputSize: INPUT_SIZE,
  inference: "ONNX Runtime CPU",
  training: "ImageNet-pretrained MobileNetV3-Small encoder; rare-hazard-aware crops; weighted cross-entropy plus Dice loss",
  modelArtifact: "mobilenetv3_unet_v1.onnx",
};

export const TERRAIN_CLASSES = [
  { id: 0, name: "soil", color: [183, 133, 84] },
  { id: 1, name: "bedrock", color: [104, 140, 180] },
  { id: 2, name: "sand", color: [221, 186, 77] },
  { id: 3, name: "big_rock", color: [217, 82, 65] },
] as const;

let sessionPromise: Promise<ort.InferenceSession> | undefined;

function getSession() {
  sessionPromise ??= ort.InferenceSession.create(MODEL_PATH, { executionProviders: ["cpu"] });
  return sessionPromise;
}

function makeInput(rgb: Buffer) {
  const pixels = INPUT_SIZE * INPUT_SIZE;
  if (rgb.length !== pixels * 3) throw new Error("Expected 256×256 RGB pixels for terrain-model inference.");
  const input = new Float32Array(3 * pixels);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const source = pixel * 3;
    input[pixel] = (rgb[source] / 255 - IMAGE_MEAN[0]) / IMAGE_STD[0];
    input[pixels + pixel] = (rgb[source + 1] / 255 - IMAGE_MEAN[1]) / IMAGE_STD[1];
    input[pixels * 2 + pixel] = (rgb[source + 2] / 255 - IMAGE_MEAN[2]) / IMAGE_STD[2];
  }
  return input;
}

export async function predictTerrain(rgb: Buffer) {
  const input = makeInput(rgb);
  const session = await getSession();
  const result = await session.run({ image: new ort.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]) });
  const output = result.logits;
  if (!output) throw new Error("The terrain model did not return logits.");
  const logits = output.data as Float32Array;
  const pixels = INPUT_SIZE * INPUT_SIZE;
  const prediction = new Uint8Array(pixels);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    let bestClass = 0;
    let bestLogit = logits[pixel];
    for (let candidate = 1; candidate < TERRAIN_CLASSES.length; candidate += 1) {
      const candidateLogit = logits[candidate * pixels + pixel];
      if (candidateLogit > bestLogit) {
        bestClass = candidate;
        bestLogit = candidateLogit;
      }
    }
    prediction[pixel] = bestClass;
  }
  return prediction;
}

export async function analyzeWithModel(sourcePng: Buffer): Promise<ModelAnalysisResult> {
  const normalized = await sharp(sourcePng).resize(INPUT_SIZE, INPUT_SIZE, { fit: "cover" }).removeAlpha().png().toBuffer();
  const { data: rgb, info } = await sharp(normalized).raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 3 || info.width !== INPUT_SIZE || info.height !== INPUT_SIZE) {
    throw new Error("Model preprocessing did not produce a 256×256 RGB image.");
  }

  const prediction = await predictTerrain(rgb);
  const counts = new Array<number>(TERRAIN_CLASSES.length).fill(0);
  const mask = Buffer.alloc(INPUT_SIZE * INPUT_SIZE * 3);
  for (let pixel = 0; pixel < prediction.length; pixel += 1) {
    const classId = prediction[pixel];
    const color = TERRAIN_CLASSES[classId].color;
    counts[classId] += 1;
    mask[pixel * 3] = color[0];
    mask[pixel * 3 + 1] = color[1];
    mask[pixel * 3 + 2] = color[2];
  }

  const maskPng = await sharp(mask, { raw: { width: INPUT_SIZE, height: INPUT_SIZE, channels: 3 } }).png().toBuffer();
  const translucentMask = await sharp(maskPng).ensureAlpha(0.64).png().toBuffer();
  const overlayPng = await sharp(normalized).composite([{ input: translucentMask, blend: "screen" }]).png().toBuffer();
  const classCoverage: TerrainClassCoverage[] = TERRAIN_CLASSES.map((item) => ({
    classId: item.id,
    className: item.name,
    pixels: counts[item.id],
    share: Number((counts[item.id] / prediction.length).toFixed(4)),
  }));

  return { metadata: MODEL_METADATA, width: INPUT_SIZE, height: INPUT_SIZE, classCoverage, maskPng, overlayPng };
}
