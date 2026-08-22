export type BackendSafeZone = {
  id: string;
  x: number;
  y: number;
  area: number;
  avg_risk: number;
};

export type BackendAssessment = {
  stats: Record<string, unknown>;
  safe_zones: BackendSafeZone[];
  images: { annotated?: string; heatmap?: string };
  fallback_triggered?: boolean;
};

export type TerrainLensAnalysis = {
  engine: { requested: "cv" | "ml"; executed: "cv" | "ml"; fallback: boolean };
  metrics: Array<{ key: string; value: string | number }>;
  safeZones: Array<{ id: string; x: number; y: number; area: number; averageRisk: number }>;
  artifacts: { annotated?: string; heatmap?: string };
  limitations: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function normalizeAssessment(raw: unknown, requested: "cv" | "ml"): TerrainLensAnalysis {
  if (!isRecord(raw) || !isRecord(raw.stats) || !Array.isArray(raw.safe_zones) || !isRecord(raw.images)) {
    throw new Error("The analysis service returned an invalid response shape.");
  }
  const fallback = raw.fallback_triggered === true;
  const safeZones = raw.safe_zones.flatMap((zone) => {
    if (!isRecord(zone) || typeof zone.id !== "string" || !isNumber(zone.x) || !isNumber(zone.y) || !isNumber(zone.area) || !isNumber(zone.avg_risk)) return [];
    return [{ id: zone.id, x: zone.x, y: zone.y, area: zone.area, averageRisk: zone.avg_risk }];
  });
  const metrics = Object.entries(raw.stats).flatMap(([key, value]) => (typeof value === "string" || isNumber(value) ? [{ key, value }] : []));
  return {
    engine: { requested, executed: fallback ? "cv" : requested, fallback },
    metrics,
    safeZones,
    artifacts: {
      annotated: typeof raw.images.annotated === "string" ? raw.images.annotated : undefined,
      heatmap: typeof raw.images.heatmap === "string" ? raw.images.heatmap : undefined,
    },
    limitations: [
      "Artifacts and candidate zones are evidence for review, not a safety guarantee.",
      "Safe-zone coordinates are returned in the backend’s processed-image coordinate space.",
    ],
  };
}

export function normaliseBackendDetail(payload: unknown, fallback: string) {
  return isRecord(payload) && typeof payload.detail === "string" ? payload.detail : fallback;
}
