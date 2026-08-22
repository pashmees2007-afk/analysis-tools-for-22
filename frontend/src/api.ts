export type ApiError = { kind: string; message: string; retryable: boolean };

export type Analysis = {
  engine: { requested: "cv" | "ml"; executed: "cv" | "ml"; fallback: boolean };
  metrics: Array<{ key: string; value: string | number }>;
  safeZones: Array<{ id: string; x: number; y: number; area: number; averageRisk: number }>;
  artifacts: { annotated?: string; heatmap?: string };
  limitations: string[];
};

export type HistoryEntry = {
  id: number;
  timestamp: string;
  engine_used: string;
  craters_found: number;
  rocks_found: number;
  top_safe_zone_id: string;
  raw_stats: string;
};

type ErrorEnvelope = { error?: ApiError };

async function bodyOrError(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = (payload as ErrorEnvelope).error;
    throw new Error(error?.message ?? "TerrainLens could not complete this request.");
  }
  return payload;
}

export async function getHealth() {
  return bodyOrError(await fetch("/api/terrainlens/health", { signal: AbortSignal.timeout(8_000) }));
}

export async function requestAnalysis(input: { file: File; engine: "cv" | "ml"; declaredTarget: string; sourceUrl: string }) {
  const body = new FormData();
  body.append("file", input.file);
  body.append("engine", input.engine);
  body.append("declaredTarget", input.declaredTarget);
  if (input.sourceUrl.trim()) body.append("sourceUrl", input.sourceUrl.trim());
  const payload = await bodyOrError(await fetch("/api/terrainlens/analyses", { method: "POST", body, signal: AbortSignal.timeout(65_000) }));
  return payload as { analysis: Analysis };
}

export async function getHistory() {
  const payload = await bodyOrError(await fetch("/api/terrainlens/history", { signal: AbortSignal.timeout(8_000) }));
  return payload as { history: HistoryEntry[] };
}
