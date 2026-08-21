import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { analyzeVisualComplexity } from "./vision.js";

function createDeterministicFixture() {
  const width = 48;
  const height = 32;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      const bright = x > 23 && y > 7 && y < 25;
      const value = bright ? ((x + y) % 4) * 60 : 24;
      pixels[index] = value;
      pixels[index + 1] = value;
      pixels[index + 2] = value;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

describe("analyzeVisualComplexity", () => {
  it("returns a ranked grid and portable visual artifacts", async () => {
    const result = await analyzeVisualComplexity(await createDeterministicFixture(), { columns: 6, rows: 4 });
    expect(result.cells).toHaveLength(24);
    expect(result.topReviewCells).toHaveLength(3);
    expect(result.cells[0]?.rank).toBe(1);
    expect(result.cells[0]?.score).toBeGreaterThanOrEqual(result.cells[1]?.score ?? 0);
    expect(result.edgeMapPng.subarray(1, 4).toString()).toBe("PNG");
    expect(result.textureMapPng.subarray(1, 4).toString()).toBe("PNG");
    expect(result.overlayPng.subarray(1, 4).toString()).toBe("PNG");
  });
});
