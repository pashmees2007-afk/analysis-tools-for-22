import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { analyzeTerrain } from "../dist/index.js";

const [, , inputPath, outputDirectory] = process.argv;

if (!inputPath || !outputDirectory) {
  throw new Error("Usage: node scripts/run-dry-run.mjs <image-path> <output-directory>");
}

const image = await fs.readFile(inputPath);
const result = await analyzeTerrain({
  filename: path.basename(inputPath),
  image,
  options: { columns: 6, rows: 4 },
});

await fs.mkdir(outputDirectory, { recursive: true });
await Promise.all([
  fs.writeFile(path.join(outputDirectory, "source.png"), result.source.png),
  fs.writeFile(path.join(outputDirectory, "model-mask.png"), result.model.maskPng),
  fs.writeFile(path.join(outputDirectory, "model-overlay.png"), result.model.overlayPng),
  fs.writeFile(path.join(outputDirectory, "edge-map.png"), result.visualComplexity.edgeMapPng),
  fs.writeFile(path.join(outputDirectory, "texture-map.png"), result.visualComplexity.textureMapPng),
  fs.writeFile(path.join(outputDirectory, "complexity-overlay.png"), result.visualComplexity.overlayPng),
  fs.writeFile(
    path.join(outputDirectory, "summary.json"),
    `${JSON.stringify(
      {
        analysisId: result.analysisId,
        source: { filename: result.source.filename, width: result.source.width, height: result.source.height },
        model: { metadata: result.model.metadata, classCoverage: result.model.classCoverage },
        visualComplexity: {
          grid: result.visualComplexity.grid,
          topReviewCells: result.visualComplexity.topReviewCells,
        },
        limitations: result.limitations,
      },
      null,
      2,
    )}\n`,
  ),
]);

console.log(`Dry-run artifacts written to ${path.resolve(outputDirectory)}`);
