import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { analyzeTerrain } from "../dist/index.js";

const SUPPORTED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const argumentsAfterScript = process.argv.slice(2).filter((argument) => argument !== "--");
const [inputDirectory, outputDirectory] = argumentsAfterScript;

if (!inputDirectory || !outputDirectory) {
  throw new Error("Usage: pnpm batch -- <input-directory> <output-directory>");
}

function outputName(index, filename) {
  const base = path.basename(filename, path.extname(filename)).replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
  return `${String(index + 1).padStart(3, "0")}-${base}`;
}

async function writeArtifacts(directory, result) {
  await fs.mkdir(directory, { recursive: true });
  const artifacts = {
    source: "source.png",
    modelMask: "model-mask.png",
    modelOverlay: "model-overlay.png",
    edgeMap: "edge-map.png",
    textureMap: "texture-map.png",
    complexityOverlay: "complexity-overlay.png",
  };
  await Promise.all([
    fs.writeFile(path.join(directory, artifacts.source), result.source.png),
    fs.writeFile(path.join(directory, artifacts.modelMask), result.model.maskPng),
    fs.writeFile(path.join(directory, artifacts.modelOverlay), result.model.overlayPng),
    fs.writeFile(path.join(directory, artifacts.edgeMap), result.visualComplexity.edgeMapPng),
    fs.writeFile(path.join(directory, artifacts.textureMap), result.visualComplexity.textureMapPng),
    fs.writeFile(path.join(directory, artifacts.complexityOverlay), result.visualComplexity.overlayPng),
  ]);
  return artifacts;
}

const entries = await fs.readdir(inputDirectory, { withFileTypes: true });
const imageFiles = entries
  .filter((entry) => entry.isFile() && SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
  .map((entry) => entry.name)
  .sort((left, right) => left.localeCompare(right));

if (imageFiles.length === 0) {
  throw new Error("No PNG, JPG, JPEG, or WEBP files were found in the input directory.");
}

await fs.mkdir(outputDirectory, { recursive: true });
const batch = { inputDirectory: path.resolve(inputDirectory), processedAt: new Date().toISOString(), totalFiles: imageFiles.length, successes: [], failures: [] };

for (const [index, filename] of imageFiles.entries()) {
  const inputPath = path.join(inputDirectory, filename);
  try {
    const result = await analyzeTerrain({ filename, image: await fs.readFile(inputPath) });
    const folder = outputName(index, filename);
    const artifacts = await writeArtifacts(path.join(outputDirectory, folder), result);
    const item = {
      filename,
      analysisId: result.analysisId,
      outputDirectory: folder,
      source: { width: result.source.width, height: result.source.height },
      classCoverage: result.model.classCoverage,
      topReviewCells: result.visualComplexity.topReviewCells,
      artifacts,
    };
    batch.successes.push(item);
    console.log(`✓ ${filename} → ${folder}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    batch.failures.push({ filename, error: message });
    console.error(`✗ ${filename}: ${message}`);
  }
}

await fs.writeFile(path.join(outputDirectory, "batch-summary.json"), `${JSON.stringify(batch, null, 2)}\n`);
console.log(`Completed ${batch.successes.length}/${batch.totalFiles} images. Summary: ${path.join(path.resolve(outputDirectory), "batch-summary.json")}`);

if (batch.failures.length > 0) process.exitCode = 1;
