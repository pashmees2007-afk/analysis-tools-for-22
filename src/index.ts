import crypto from "node:crypto";
import sharp from "sharp";
import type { GridSettings, TerrainAnalysisInput, TerrainAnalysisResult } from "./contracts.js";
import { analyzeWithModel } from "./modules/model.js";
import { analyzeVisualComplexity } from "./modules/vision.js";

export * from "./contracts.js";
export { MODEL_METADATA, TERRAIN_CLASSES } from "./modules/model.js";

const DEFAULT_GRID: GridSettings = { columns: 6, rows: 4 };

function validateGrid(input: TerrainAnalysisInput["options"]): GridSettings {
  const columns = input?.columns ?? DEFAULT_GRID.columns;
  const rows = input?.rows ?? DEFAULT_GRID.rows;
  if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1 || columns > 12 || rows > 12) {
    throw new Error("Grid columns and rows must be integers between 1 and 12.");
  }
  return { columns, rows };
}

export async function analyzeTerrain(input: TerrainAnalysisInput): Promise<TerrainAnalysisResult> {
  if (!input.filename.trim()) throw new Error("A source filename is required.");
  if (!input.image.length) throw new Error("An image buffer is required.");
  const grid = validateGrid(input.options);
  const sourcePng = await sharp(input.image).rotate().removeAlpha().png().toBuffer();
  const metadata = await sharp(sourcePng).metadata();
  if (!metadata.width || !metadata.height) throw new Error("The uploaded image has no dimensions.");
  const [model, visualComplexity] = await Promise.all([
    analyzeWithModel(sourcePng),
    analyzeVisualComplexity(sourcePng, grid),
  ]);
  return {
    analysisId: crypto.randomUUID(),
    source: { filename: input.filename, width: metadata.width, height: metadata.height, png: sourcePng },
    model,
    visualComplexity,
    limitations: [
      "Model output is decision-support evidence only and must be reviewed with the source image and mission constraints.",
      "Visual-complexity scores measure local image edges, texture, and contrast only; they do not prove an area is dangerous or safe.",
      "Neither analysis path establishes ground truth for an arbitrary planetary body, sensor, scale, lighting condition, or mission use case.",
    ],
  };
}
