import sharp from "sharp";
import type { GridSettings, ReviewCell, VisualComplexityResult } from "../contracts.js";

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function normalize(value: number, min: number, max: number) {
  return max === min ? 0 : (value - min) / (max - min);
}

function toPng(raw: Buffer, width: number, height: number) {
  return sharp(raw, { raw: { width, height, channels: 1 } }).png().toBuffer();
}

function toGrayscale(rgb: Buffer, width: number, height: number) {
  const gray = Buffer.alloc(width * height);
  for (let index = 0; index < gray.length; index += 1) {
    const base = index * 3;
    gray[index] = clamp(rgb[base] * 0.299 + rgb[base + 1] * 0.587 + rgb[base + 2] * 0.114);
  }
  return gray;
}

function calculateMaps(gray: Buffer, width: number, height: number) {
  const gradient = new Float64Array(width * height);
  const laplacian = new Float64Array(width * height);
  let maxGradient = 1;
  let maxLaplacian = 1;
  const at = (x: number, y: number) => gray[y * width + x];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = y * width + x;
      const gx = -at(x - 1, y - 1) + at(x + 1, y - 1) - 2 * at(x - 1, y) + 2 * at(x + 1, y) - at(x - 1, y + 1) + at(x + 1, y + 1);
      const gy = at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) - at(x - 1, y + 1) - 2 * at(x, y + 1) - at(x + 1, y + 1);
      const g = Math.hypot(gx, gy);
      const l = Math.abs(at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1) - 4 * at(x, y));
      gradient[index] = g;
      laplacian[index] = l;
      maxGradient = Math.max(maxGradient, g);
      maxLaplacian = Math.max(maxLaplacian, l);
    }
  }
  const edgeMap = Buffer.alloc(width * height);
  const textureMap = Buffer.alloc(width * height);
  for (let index = 0; index < edgeMap.length; index += 1) {
    edgeMap[index] = clamp((gradient[index] / maxGradient) * 255);
    textureMap[index] = clamp((laplacian[index] / maxLaplacian) * 255);
  }
  return { gradient, laplacian, edgeMap, textureMap };
}

function calculateCells(
  gray: Buffer,
  gradient: Float64Array,
  laplacian: Float64Array,
  width: number,
  height: number,
  grid: GridSettings,
) {
  const cells: Omit<ReviewCell, "rank" | "score">[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const x = Math.floor((column * width) / grid.columns);
      const endX = Math.floor(((column + 1) * width) / grid.columns);
      const y = Math.floor((row * height) / grid.rows);
      const endY = Math.floor(((row + 1) * height) / grid.rows);
      const cellWidth = endX - x;
      const cellHeight = endY - y;
      const pixels = cellWidth * cellHeight;
      let gradients = 0;
      let textureSum = 0;
      let sum = 0;
      let sumSquares = 0;
      for (let pointY = y; pointY < endY; pointY += 1) {
        for (let pointX = x; pointX < endX; pointX += 1) {
          const index = pointY * width + pointX;
          gradients += gradient[index] >= 65 ? 1 : 0;
          textureSum += laplacian[index] ** 2;
          sum += gray[index];
          sumSquares += gray[index] ** 2;
        }
      }
      const mean = sum / pixels;
      cells.push({
        row,
        column,
        x,
        y,
        width: cellWidth,
        height: cellHeight,
        edgeDensity: Number((gradients / pixels).toFixed(5)),
        textureVariance: Number((textureSum / pixels).toFixed(2)),
        contrast: Number(Math.sqrt(Math.max(0, sumSquares / pixels - mean ** 2)).toFixed(3)),
      });
    }
  }
  const edgeRange = cells.map((cell) => cell.edgeDensity);
  const textureRange = cells.map((cell) => cell.textureVariance);
  const contrastRange = cells.map((cell) => cell.contrast);
  const edgeMin = Math.min(...edgeRange);
  const edgeMax = Math.max(...edgeRange);
  const textureMin = Math.min(...textureRange);
  const textureMax = Math.max(...textureRange);
  const contrastMin = Math.min(...contrastRange);
  const contrastMax = Math.max(...contrastRange);
  return cells
    .map((cell) => ({
      ...cell,
      rank: 0,
      score: Number((0.4 * normalize(cell.edgeDensity, edgeMin, edgeMax) + 0.35 * normalize(cell.textureVariance, textureMin, textureMax) + 0.25 * normalize(cell.contrast, contrastMin, contrastMax)).toFixed(4)),
    }))
    .sort((a, b) => b.score - a.score)
    .map((cell, index) => ({ ...cell, rank: index + 1 }));
}

async function renderOverlay(sourcePng: Buffer, width: number, height: number, topCells: ReviewCell[]) {
  const overlay = Buffer.alloc(width * height * 4);
  for (const cell of topCells) {
    const [red, green, blue] = cell.rank === 1 ? [225, 61, 61] : cell.rank === 2 ? [244, 159, 0] : [245, 201, 68];
    for (let y = cell.y; y < cell.y + cell.height; y += 1) {
      for (let x = cell.x; x < cell.x + cell.width; x += 1) {
        const index = (y * width + x) * 4;
        const border = x - cell.x < 2 || cell.x + cell.width - x <= 2 || y - cell.y < 2 || cell.y + cell.height - y <= 2;
        overlay[index] = red;
        overlay[index + 1] = green;
        overlay[index + 2] = blue;
        overlay[index + 3] = border ? 235 : 54;
      }
    }
  }
  const overlayPng = await sharp(overlay, { raw: { width, height, channels: 4 } }).png().toBuffer();
  return sharp(sourcePng).composite([{ input: overlayPng }]).png().toBuffer();
}

export async function analyzeVisualComplexity(sourcePng: Buffer, grid: GridSettings): Promise<VisualComplexityResult> {
  const { data: rgb, info } = await sharp(sourcePng).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) throw new Error("Visual-complexity analysis requires RGB pixels.");
  const gray = toGrayscale(rgb, info.width, info.height);
  const { gradient, laplacian, edgeMap, textureMap } = calculateMaps(gray, info.width, info.height);
  const cells = calculateCells(gray, gradient, laplacian, info.width, info.height, grid);
  const topReviewCells = cells.slice(0, 3);
  const overlayPng = await renderOverlay(sourcePng, info.width, info.height, topReviewCells);
  return {
    width: info.width,
    height: info.height,
    grid,
    cells,
    topReviewCells,
    edgeMapPng: await toPng(edgeMap, info.width, info.height),
    textureMapPng: await toPng(textureMap, info.width, info.height),
    overlayPng,
  };
}
