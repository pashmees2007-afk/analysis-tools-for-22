import sharp from "sharp";

const GRID_SIZE = 5;

export type CvZone = {
  id: string;
  row: number;
  col: number;
  risk: number;
  edgeDensity: number;
  circlePressure: number;
  classification: "PREFERRED" | "REVIEW" | "AVOID";
};

export type CircularFeature = {
  id: string;
  x: number;
  y: number;
  r: number;
  score: number;
};

export type CvAnalysis = {
  preprocessingPng: Buffer;
  edgePng: Buffer;
  circlesPng: Buffer;
  hazardsPng: Buffer;
  edgePixelCount: number;
  edgeDensity: number;
  meanGradient: number;
  circularFeatures: CircularFeature[];
  zones: CvZone[];
};

function clamp(value: number, lower: number, upper: number) {
  return Math.min(upper, Math.max(lower, value));
}

function percentile(values: Uint8Array, ratio: number) {
  const bins = new Uint32Array(256);
  for (let index = 0; index < values.length; index += 1) bins[values[index]] += 1;
  const target = Math.max(0, Math.min(values.length - 1, Math.floor((values.length - 1) * ratio)));
  let cumulative = 0;
  for (let value = 0; value < bins.length; value += 1) {
    cumulative += bins[value];
    if (cumulative > target) return value;
  }
  return 255;
}

function toRgb(gray: Uint8Array) {
  const rgb = Buffer.alloc(gray.length * 3);
  for (let index = 0; index < gray.length; index += 1) {
    const offset = index * 3;
    rgb[offset] = gray[index];
    rgb[offset + 1] = gray[index];
    rgb[offset + 2] = gray[index];
  }
  return rgb;
}

function setPixel(buffer: Buffer, width: number, height: number, x: number, y: number, color: readonly [number, number, number]) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const offset = (y * width + x) * 3;
  buffer[offset] = color[0];
  buffer[offset + 1] = color[1];
  buffer[offset + 2] = color[2];
}

function drawCircle(buffer: Buffer, width: number, height: number, x: number, y: number, radius: number, color: readonly [number, number, number]) {
  const steps = Math.max(24, Math.ceil(2 * Math.PI * radius));
  for (let step = 0; step < steps; step += 1) {
    const theta = (step / steps) * 2 * Math.PI;
    setPixel(buffer, width, height, Math.round(x + Math.cos(theta) * radius), Math.round(y + Math.sin(theta) * radius), color);
  }
}

function findCircularFeatures(edges: Uint8Array, width: number, height: number): CircularFeature[] {
  const visited = new Uint8Array(edges.length);
  const candidates: Array<{ x: number; y: number; r: number; score: number }> = [];
  const queue: number[] = [];

  for (let seed = 0; seed < edges.length; seed += 1) {
    if (!edges[seed] || visited[seed]) continue;
    visited[seed] = 1;
    queue.length = 0;
    queue.push(seed);
    let head = 0;
    let count = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    while (head < queue.length) {
      const index = queue[head++];
      const x = index % width;
      const y = Math.floor(index / width);
      count += 1;
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nextX = x + dx;
          const nextY = y + dy;
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
          const next = nextY * width + nextX;
          if (edges[next] && !visited[next]) {
            visited[next] = 1;
            queue.push(next);
          }
        }
      }
    }

    const boxWidth = maxX - minX + 1;
    const boxHeight = maxY - minY + 1;
    const radius = (boxWidth + boxHeight) / 4;
    const aspect = Math.min(boxWidth, boxHeight) / Math.max(boxWidth, boxHeight);
    const perimeterEstimate = 2 * Math.PI * radius;
    const edgeCoverage = count / Math.max(perimeterEstimate, 1);
    const score = clamp(aspect * Math.min(edgeCoverage, 1.4) * Math.min(radius / 12, 1), 0, 1);

    if (count >= 20 && radius >= 6 && radius <= Math.min(width, height) * 0.28 && aspect >= 0.58 && score >= 0.28) {
      candidates.push({ x: Math.round(sumX / count), y: Math.round(sumY / count), r: Math.round(radius), score });
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score || b.r - a.r)
    .slice(0, 8)
    .map((candidate, index) => ({ ...candidate, id: `CF-${String(index + 1).padStart(2, "0")}`, score: Number(candidate.score.toFixed(3)) }));
}

function buildZones(edges: Uint8Array, width: number, height: number, features: CircularFeature[]): CvZone[] {
  const zones: CvZone[] = [];
  const cellWidth = width / GRID_SIZE;
  const cellHeight = height / GRID_SIZE;

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const startX = Math.floor(col * cellWidth);
      const endX = Math.floor((col + 1) * cellWidth);
      const startY = Math.floor(row * cellHeight);
      const endY = Math.floor((row + 1) * cellHeight);
      let edgeCount = 0;
      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) edgeCount += edges[y * width + x];
      }
      const pixelCount = Math.max(1, (endX - startX) * (endY - startY));
      const edgeDensity = edgeCount / pixelCount;
      const circlePressure = features.reduce((total, feature) => {
        const nearestX = clamp(feature.x, startX, endX);
        const nearestY = clamp(feature.y, startY, endY);
        const distance = Math.hypot(feature.x - nearestX, feature.y - nearestY);
        return total + (distance <= feature.r ? feature.score : 0);
      }, 0);
      const normalizedEdge = clamp(edgeDensity / 0.22, 0, 1);
      const normalizedCircle = clamp(circlePressure / 1.5, 0, 1);
      const risk = Number(((normalizedEdge * 0.68 + normalizedCircle * 0.32) * 10).toFixed(1));
      const classification = risk <= 3.25 ? "PREFERRED" : risk <= 6.25 ? "REVIEW" : "AVOID";
      zones.push({
        id: `${String.fromCharCode(65 + row)}${col + 1}`,
        row,
        col,
        risk,
        edgeDensity: Number(edgeDensity.toFixed(4)),
        circlePressure: Number(circlePressure.toFixed(4)),
        classification,
      });
    }
  }
  return zones;
}

export async function analyzeTerrainCv(rgb: Buffer, width: number, height: number): Promise<CvAnalysis> {
  if (rgb.length !== width * height * 3) throw new Error("Expected interleaved RGB pixels for CV analysis.");

  const pixels = width * height;
  const grayscale = new Uint8Array(pixels);
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * 3;
    grayscale[pixel] = Math.round(rgb[offset] * 0.299 + rgb[offset + 1] * 0.587 + rgb[offset + 2] * 0.114);
  }

  const low = percentile(grayscale, 0.05);
  const high = Math.max(low + 1, percentile(grayscale, 0.95));
  const normalized = new Uint8Array(pixels);
  for (let pixel = 0; pixel < pixels; pixel += 1) normalized[pixel] = Math.round(clamp((grayscale[pixel] - low) * (255 / (high - low)), 0, 255));

  const magnitudes = new Float32Array(pixels);
  let magnitudeSum = 0;
  let magnitudeSquareSum = 0;
  let samples = 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const topLeft = normalized[(y - 1) * width + x - 1];
      const top = normalized[(y - 1) * width + x];
      const topRight = normalized[(y - 1) * width + x + 1];
      const left = normalized[y * width + x - 1];
      const right = normalized[y * width + x + 1];
      const bottomLeft = normalized[(y + 1) * width + x - 1];
      const bottom = normalized[(y + 1) * width + x];
      const bottomRight = normalized[(y + 1) * width + x + 1];
      const gx = -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight;
      const gy = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight;
      const magnitude = Math.min(255, Math.hypot(gx, gy) / 4);
      const index = y * width + x;
      magnitudes[index] = magnitude;
      magnitudeSum += magnitude;
      magnitudeSquareSum += magnitude * magnitude;
      samples += 1;
    }
  }
  const meanGradient = magnitudeSum / Math.max(samples, 1);
  const variance = Math.max(0, magnitudeSquareSum / Math.max(samples, 1) - meanGradient * meanGradient);
  const threshold = clamp(meanGradient + Math.sqrt(variance) * 1.05, 24, 110);
  const edges = new Uint8Array(pixels);
  let edgePixelCount = 0;
  for (let index = 0; index < pixels; index += 1) {
    if (magnitudes[index] >= threshold) {
      edges[index] = 1;
      edgePixelCount += 1;
    }
  }

  const circularFeatures = findCircularFeatures(edges, width, height);
  const zones = buildZones(edges, width, height, circularFeatures);
  const preprocessingRgb = toRgb(normalized);
  const edgeRgb = Buffer.from(preprocessingRgb);
  const circlesRgb = Buffer.from(preprocessingRgb);
  const hazardsRgb = Buffer.from(rgb);
  for (let index = 0; index < pixels; index += 1) {
    if (!edges[index]) continue;
    const offset = index * 3;
    edgeRgb[offset] = 228;
    edgeRgb[offset + 1] = 72;
    edgeRgb[offset + 2] = 53;
    hazardsRgb[offset] = Math.round(hazardsRgb[offset] * 0.35 + 165);
    hazardsRgb[offset + 1] = Math.round(hazardsRgb[offset + 1] * 0.25 + 18);
    hazardsRgb[offset + 2] = Math.round(hazardsRgb[offset + 2] * 0.25 + 18);
  }
  for (const feature of circularFeatures) {
    drawCircle(circlesRgb, width, height, feature.x, feature.y, feature.r, [241, 197, 78]);
    drawCircle(hazardsRgb, width, height, feature.x, feature.y, feature.r, [241, 197, 78]);
  }

  const encode = (data: Buffer) => sharp(data, { raw: { width, height, channels: 3 } }).png().toBuffer();
  const [preprocessingPng, edgePng, circlesPng, hazardsPng] = await Promise.all([
    encode(preprocessingRgb),
    encode(edgeRgb),
    encode(circlesRgb),
    encode(hazardsRgb),
  ]);

  return {
    preprocessingPng,
    edgePng,
    circlesPng,
    hazardsPng,
    edgePixelCount,
    edgeDensity: Number((edgePixelCount / pixels).toFixed(4)),
    meanGradient: Number(meanGradient.toFixed(2)),
    circularFeatures,
    zones,
  };
}
