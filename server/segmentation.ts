import crypto from "node:crypto";
import sharp from "sharp";
import { storagePut } from "./storage";
import { analyzeTerrainCv, type CircularFeature, type CvZone } from "./cvAnalysis";
import { getClassColor, predictTerrain, SEGMENTATION_MODEL, TERRAIN_CLASSES } from "./segmentationModel";

export type SegmentationResult = {
  analysisId: string;
  model: typeof SEGMENTATION_MODEL;
  sourceUrl: string;
  predictionUrl: string;
  overlayUrl: string;
  width: number;
  height: number;
  classCounts: Array<{ classId: number; className: string; pixels: number; share: number }>;
  cv: {
    preprocessingUrl: string;
    edgeUrl: string;
    circlesUrl: string;
    hazardUrl: string;
    edgePixelCount: number;
    edgeDensity: number;
    meanGradient: number;
    circularFeatures: CircularFeature[];
    zones: CvZone[];
    disclaimer: string;
  };
  disclaimer: string;
};

const TARGET_SIZE = 256;

function parseDataUrl(dataUrl: string) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error("Use a PNG, JPG, or WEBP data URL.");
  return { data: Buffer.from(match[2], "base64") };
}

export async function runSegmentation(dataUrl: string, filename: string): Promise<SegmentationResult> {
  const { data } = parseDataUrl(dataUrl);
  const normalized = await sharp(data).rotate().resize(TARGET_SIZE, TARGET_SIZE, { fit: "cover" }).removeAlpha().png().toBuffer();
  const { data: rgb, info } = await sharp(normalized).raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) throw new Error("Terrain image preprocessing did not produce RGB pixels.");

  const [prediction, cv] = await Promise.all([
    predictTerrain(rgb, info.width, info.height),
    analyzeTerrainCv(rgb, info.width, info.height),
  ]);
  const counts = [0, 0, 0, 0];
  const rendered = Buffer.alloc(info.width * info.height * 3);
  for (let pixel = 0; pixel < prediction.length; pixel += 1) {
    const classId = prediction[pixel];
    counts[classId] += 1;
    const color = getClassColor(classId);
    rendered[pixel * 3] = color[0];
    rendered[pixel * 3 + 1] = color[1];
    rendered[pixel * 3 + 2] = color[2];
  }

  const predictionPng = await sharp(rendered, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toBuffer();
  const overlayPng = await sharp(normalized).composite([{ input: predictionPng, blend: "screen" }]).png().toBuffer();
  const analysisId = crypto.randomUUID();
  const cleanName = filename.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 96) || "terrain.png";
  const [source, predictionFile, overlay, preprocessingFile, edgeFile, circlesFile, hazardFile] = await Promise.all([
    storagePut(`segmentation/${analysisId}/source_${cleanName}`, normalized, "image/png"),
    storagePut(`segmentation/${analysisId}/prediction.png`, predictionPng, "image/png"),
    storagePut(`segmentation/${analysisId}/overlay.png`, overlayPng, "image/png"),
    storagePut(`segmentation/${analysisId}/cv_preprocessing.png`, cv.preprocessingPng, "image/png"),
    storagePut(`segmentation/${analysisId}/cv_edges.png`, cv.edgePng, "image/png"),
    storagePut(`segmentation/${analysisId}/cv_circles.png`, cv.circlesPng, "image/png"),
    storagePut(`segmentation/${analysisId}/cv_hazards.png`, cv.hazardsPng, "image/png"),
  ]);
  const total = info.width * info.height;
  return {
    analysisId,
    model: SEGMENTATION_MODEL,
    sourceUrl: source.url,
    predictionUrl: predictionFile.url,
    overlayUrl: overlay.url,
    width: info.width,
    height: info.height,
    classCounts: TERRAIN_CLASSES.map(item => ({ classId: item.id, className: item.name, pixels: counts[item.id], share: Number((counts[item.id] / total).toFixed(4)) })),
    cv: {
      preprocessingUrl: preprocessingFile.url,
      edgeUrl: edgeFile.url,
      circlesUrl: circlesFile.url,
      hazardUrl: hazardFile.url,
      edgePixelCount: cv.edgePixelCount,
      edgeDensity: cv.edgeDensity,
      meanGradient: cv.meanGradient,
      circularFeatures: cv.circularFeatures,
      zones: cv.zones,
      disclaimer: "This deterministic visual-complexity analysis highlights image edges and circular-shape candidates for human review. It does not identify geology, validate hazards, or provide a safety or landing recommendation.",
    },
    disclaimer: "This research model was evaluated on a fixed 300-image AI4Mars MSL test split, not on this upload. Its pixel classes are decision-support evidence only; they are not flight-qualified and must be reviewed with the source imagery and other mission constraints.",
  };
}
