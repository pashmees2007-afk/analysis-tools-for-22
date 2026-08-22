import { fileURLToPath } from "node:url";
import * as ort from "onnxruntime-node";

const INPUT_SIZE = 256;
const MODEL_PATH = fileURLToPath(new URL("./models/mobilenetv3_unet_v1.onnx", import.meta.url));
const IMAGE_MEAN = [0.485, 0.456, 0.406] as const;
const IMAGE_STD = [0.229, 0.224, 0.225] as const;

export const SEGMENTATION_MODEL = {
  version: "ai4mars-msl-mobilenetv3-unet-v1",
  label: "MobileNetV3-Small U-Net semantic terrain segmenter",
  trainingPairs: 1900,
  validationPairs: 300,
  heldOutTestPairs: 300,
  inputSize: INPUT_SIZE,
  inputChannels: ["red", "green", "blue"],
  normalization: { mean: IMAGE_MEAN, std: IMAGE_STD },
  training: "ImageNet-pretrained MobileNetV3-Small encoder; rare-hazard-aware crops; weighted cross-entropy plus Dice loss",
  checkpointSelection: "Epoch 11 selected solely by macro F1 on the fixed 300-image validation split.",
  heldOutTestMetrics: {
    pixelAccuracy: 0.8202244686696005,
    macroF1: 0.8175432951550509,
    classF1: { soil: 0.8310550033975721, bedrock: 0.8326316436755693, sand: 0.7849446115568336, bigRock: 0.8215419219902286 },
  },
  inference: "ONNX Runtime CPU",
  modelArtifact: "mobilenetv3_unet_v1.onnx",
} as const;

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

/** Convert 256×256 interleaved RGB bytes to the NCHW ImageNet-normalized tensor used during model evaluation. */
function makeInput(rgb: Buffer, width: number, height: number) {
  if (width !== INPUT_SIZE || height !== INPUT_SIZE || rgb.length !== width * height * 3) {
    throw new Error(`Expected ${INPUT_SIZE}×${INPUT_SIZE} RGB terrain pixels for neural inference.`);
  }
  const pixels = width * height;
  const input = new Float32Array(3 * pixels);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * 3;
    input[pixel] = (rgb[offset] / 255 - IMAGE_MEAN[0]) / IMAGE_STD[0];
    input[pixels + pixel] = (rgb[offset + 1] / 255 - IMAGE_MEAN[1]) / IMAGE_STD[1];
    input[pixels * 2 + pixel] = (rgb[offset + 2] / 255 - IMAGE_MEAN[2]) / IMAGE_STD[2];
  }
  return input;
}

/** Run the exported MobileNetV3-U-Net and return one AI4Mars terrain class ID for each pixel. */
export async function predictTerrain(rgb: Buffer, width: number, height: number) {
  const input = makeInput(rgb, width, height);
  const session = await getSession();
  const result = await session.run({ image: new ort.Tensor("float32", input, [1, 3, height, width]) });
  const output = result.logits;
  if (!output) throw new Error("The terrain model did not return logits.");
  const logits = output.data as Float32Array;
  const pixels = width * height;
  const prediction = new Uint8Array(pixels);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    let classId = 0;
    let bestLogit = logits[pixel];
    for (let candidate = 1; candidate < TERRAIN_CLASSES.length; candidate += 1) {
      const logit = logits[candidate * pixels + pixel];
      if (logit > bestLogit) {
        bestLogit = logit;
        classId = candidate;
      }
    }
    prediction[pixel] = classId;
  }
  return prediction;
}

export function getClassColor(classId: number) {
  return TERRAIN_CLASSES[classId]?.color ?? [0, 0, 0];
}
