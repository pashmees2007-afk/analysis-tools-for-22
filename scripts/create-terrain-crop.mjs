import fs from "node:fs/promises";
import process from "node:process";
import sharp from "sharp";

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  throw new Error("Usage: node scripts/create-terrain-crop.mjs <image-path> <output-path>");
}

const input = await fs.readFile(inputPath);

// Select the center, calibrated terrain panel and omit the surrounding labels.
const cropped = await sharp(input)
  .extract({ left: 245, top: 76, width: 220, height: 313 })
  .jpeg({ quality: 95 })
  .toBuffer();

await fs.writeFile(outputPath, cropped);
console.log(`Terrain crop written to ${outputPath}`);
