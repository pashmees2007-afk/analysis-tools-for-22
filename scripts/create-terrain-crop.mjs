import fs from "node:fs/promises";
import process from "node:process";
import sharp from "sharp";

const [, , inputPath, outputPath, leftArgument, topArgument, widthArgument, heightArgument] = process.argv;

if (!inputPath || !outputPath) {
  throw new Error("Usage: node scripts/create-terrain-crop.mjs <image-path> <output-path> [left top width height]");
}

const input = await fs.readFile(inputPath);
const suppliedCrop = [leftArgument, topArgument, widthArgument, heightArgument];
const crop = suppliedCrop.every((value) => value !== undefined)
  ? suppliedCrop.map((value) => Number(value))
  : [245, 76, 220, 313];

if (crop.length !== 4 || crop.some((value) => !Number.isInteger(value) || value < 0)) {
  throw new Error("Crop values must be four non-negative integers: left top width height.");
}

// Defaults to the center terrain panel in the NASA three-panel reference image.
const cropped = await sharp(input)
  .extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] })
  .jpeg({ quality: 95 })
  .toBuffer();

await fs.writeFile(outputPath, cropped);
console.log(`Terrain crop written to ${outputPath}`);
