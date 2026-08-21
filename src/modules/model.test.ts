import { describe, expect, it } from "vitest";
import { MODEL_METADATA, predictTerrain, TERRAIN_CLASSES } from "./model.js";

describe("terrain-model module", () => {
  it("exposes the expected model metadata and class contract", () => {
    expect(MODEL_METADATA.inputSize).toBe(256);
    expect(TERRAIN_CLASSES.map((item) => item.name)).toEqual(["soil", "bedrock", "sand", "big_rock"]);
  });

  it("returns one valid terrain class for each model pixel", async () => {
    const output = await predictTerrain(Buffer.alloc(256 * 256 * 3));
    expect(output).toHaveLength(256 * 256);
    expect([...output].every((classId) => classId >= 0 && classId < TERRAIN_CLASSES.length)).toBe(true);
  }, 30_000);
});
