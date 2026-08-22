import { describe, expect, it } from "vitest";
import { predictTerrain, SEGMENTATION_MODEL, TERRAIN_CLASSES } from "./segmentationModel";

describe("MobileNetV3-U-Net terrain model", () => {
  it("exposes the four labelled AI4Mars terrain classes", () => {
    expect(TERRAIN_CLASSES.map(item => item.name)).toEqual(["soil", "bedrock", "sand", "big_rock"]);
  });

  it("records the fixed-split neural-model provenance and held-out metrics", () => {
    expect(SEGMENTATION_MODEL.version).toBe("ai4mars-msl-mobilenetv3-unet-v1");
    expect(SEGMENTATION_MODEL.trainingPairs).toBe(1900);
    expect(SEGMENTATION_MODEL.validationPairs).toBe(300);
    expect(SEGMENTATION_MODEL.heldOutTestPairs).toBe(300);
    expect(SEGMENTATION_MODEL.heldOutTestMetrics.macroF1).toBeGreaterThan(0.8);
    expect(SEGMENTATION_MODEL.heldOutTestMetrics.classF1.sand).toBeGreaterThan(0.7);
    expect(SEGMENTATION_MODEL.heldOutTestMetrics.classF1.bigRock).toBeGreaterThan(0.8);
  });

  it("runs the exported model on a normalized RGB terrain tile and returns valid class IDs", async () => {
    const rgb = Buffer.alloc(256 * 256 * 3, 128);
    const prediction = await predictTerrain(rgb, 256, 256);
    expect(prediction).toHaveLength(256 * 256);
    expect([...prediction].every(classId => classId >= 0 && classId < TERRAIN_CLASSES.length)).toBe(true);
  });
});
