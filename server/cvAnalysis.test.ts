import { describe, expect, it } from "vitest";
import { analyzeTerrainCv } from "./cvAnalysis";

function createTestTerrain(size = 128) {
  const image = Buffer.alloc(size * size * 3, 86);
  const center = size / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x - center, y - center);
      const value = Math.round(70 + (x / size) * 80 + (distance > 22 && distance < 25 ? 90 : 0));
      const offset = (y * size + x) * 3;
      image[offset] = value;
      image[offset + 1] = Math.max(0, value - 20);
      image[offset + 2] = Math.max(0, value - 45);
    }
  }
  return image;
}

describe("deterministic terrain CV", () => {
  it("produces mapped evidence and a complete grid from RGB terrain pixels", async () => {
    const result = await analyzeTerrainCv(createTestTerrain(), 128, 128);

    expect(result.edgePixelCount).toBeGreaterThan(0);
    expect(result.edgeDensity).toBeGreaterThan(0);
    expect(result.zones).toHaveLength(25);
    expect(result.zones.map(zone => zone.id)).toContain("C3");
    expect(result.zones.every(zone => zone.risk >= 0 && zone.risk <= 10)).toBe(true);
    expect(result.preprocessingPng.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(result.edgePng.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(result.circlesPng.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(result.hazardsPng.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  });
});
