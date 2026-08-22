import { describe, expect, it } from "vitest";
import { normalizeAssessment } from "./normalize.js";

describe("normalizeAssessment", () => {
  it("normalizes a current CV response without manufacturing unsupported fields", () => {
    const result = normalizeAssessment({
      stats: { craters_detected: 2, global_roughness_index: 42.3 },
      safe_zones: [{ id: "LZ-1", x: 41, y: 29, area: 920, avg_risk: 0.12 }],
      images: { annotated: "data:image/jpeg;base64,a", heatmap: "data:image/jpeg;base64,b" },
    }, "cv");
    expect(result.engine).toEqual({ requested: "cv", executed: "cv", fallback: false });
    expect(result.safeZones[0]).toEqual({ id: "LZ-1", x: 41, y: 29, area: 920, averageRisk: 0.12 });
    expect(result.artifacts.heatmap).toContain("data:image/jpeg");
  });

  it("discloses ML fallback as CV execution", () => {
    const result = normalizeAssessment({ stats: {}, safe_zones: [], images: {}, fallback_triggered: true }, "ml");
    expect(result.engine).toEqual({ requested: "ml", executed: "cv", fallback: true });
  });
});
