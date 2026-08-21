import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { analyzeTerrain } from "./index.js";

function createTerrainLikeFixture() {
  const width = 64;
  const height = 48;
  const rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      const ridge = Math.abs(y - Math.floor(x * 0.45) - 15) < 3;
      const noise = ((x * 17 + y * 29) % 23) - 11;
      const base = ridge ? 175 : 86;
      rgb[index] = base + noise;
      rgb[index + 1] = base + noise;
      rgb[index + 2] = base + noise;
    }
  }
  return sharp(rgb, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

describe("analyzeTerrain", () => {
  it("returns compatible model and visual-complexity evidence in one response", async () => {
    const result = await analyzeTerrain({
      filename: "terrain-fixture.png",
      image: await createTerrainLikeFixture(),
      options: { columns: 6, rows: 4 },
    });
    expect(result.source).toMatchObject({ filename: "terrain-fixture.png", width: 64, height: 48 });
    expect(result.model.classCoverage).toHaveLength(4);
    expect(result.visualComplexity.cells).toHaveLength(24);
    expect(result.visualComplexity.topReviewCells).toHaveLength(3);
    expect(result.limitations).toHaveLength(3);
    expect(result.model.maskPng.subarray(1, 4).toString()).toBe("PNG");
    expect(result.visualComplexity.overlayPng.subarray(1, 4).toString()).toBe("PNG");
  }, 30_000);
});
