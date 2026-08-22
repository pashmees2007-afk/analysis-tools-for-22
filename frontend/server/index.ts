import express from "express";
import multer from "multer";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { normalizeAssessment, normaliseBackendDetail } from "./normalize.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const backendUrl = process.env.BACKEND_API_BASE_URL?.replace(/\/$/, "");
const backendKey = process.env.BACKEND_API_KEY;
const port = Number(process.env.PORT ?? 5173);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function configurationError() {
  return { error: { kind: "backend_unavailable", message: "TerrainLens is not connected to an analysis service.", retryable: false } };
}

function parseEngine(value: unknown): "cv" | "ml" | null {
  return value === "cv" || value === "ml" ? value : null;
}

app.get("/api/terrainlens/health", async (_req, res) => {
  if (!backendUrl || !backendKey) return res.status(503).json(configurationError());
  try {
    const response = await fetch(`${backendUrl}/health`, { signal: AbortSignal.timeout(8_000) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return res.status(response.status).json({ error: { kind: "backend_unavailable", message: normaliseBackendDetail(payload, "The analysis service is unavailable."), retryable: true } });
    return res.json({ connected: true, service: payload });
  } catch {
    return res.status(503).json({ error: { kind: "backend_unavailable", message: "The analysis service could not be reached.", retryable: true } });
  }
});

app.post("/api/terrainlens/analyses", upload.single("file"), async (req, res) => {
  if (!backendUrl || !backendKey) return res.status(503).json(configurationError());
  const engine = parseEngine(req.body.engine);
  if (!engine) return res.status(422).json({ error: { kind: "invalid_configuration", message: "Analysis engine must be CV or ML.", retryable: false } });
  if (!req.file) return res.status(422).json({ error: { kind: "missing_file", message: "Select a terrain image before starting analysis.", retryable: false } });
  if (!allowedTypes.has(req.file.mimetype)) return res.status(415).json({ error: { kind: "unsupported_format", message: "Only JPG, PNG, and WEBP images are supported.", retryable: false } });
  try {
    const body = new FormData();
    body.append("file", new Blob([Uint8Array.from(req.file.buffer)], { type: req.file.mimetype }), req.file.originalname);
    body.append("engine", engine);
    body.append("declared_target", typeof req.body.declaredTarget === "string" ? req.body.declaredTarget : "Unknown");
    if (typeof req.body.sourceUrl === "string" && req.body.sourceUrl.trim()) body.append("source_url", req.body.sourceUrl.trim());
    const response = await fetch(`${backendUrl}/api/v1/assessments`, {
      method: "POST",
      headers: { "X-Mission-Control-Key": backendKey },
      body,
      signal: AbortSignal.timeout(60_000),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const kind = response.status === 429 ? "rate_limited" : response.status === 413 ? "file_too_large" : response.status === 415 ? "unsupported_format" : response.status === 403 ? "access_denied" : response.status >= 500 ? "analysis_failed" : "request_rejected";
      return res.status(response.status).json({ error: { kind, message: normaliseBackendDetail(payload, "The analysis request was rejected."), retryable: response.status === 429 || response.status >= 500 } });
    }
    return res.json({ analysis: normalizeAssessment(payload, engine) });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError" ? "The analysis request timed out." : "The analysis service could not be reached.";
    return res.status(503).json({ error: { kind: "backend_unavailable", message, retryable: true } });
  }
});

app.get("/api/terrainlens/history", async (req, res) => {
  if (!backendUrl || !backendKey) return res.status(503).json(configurationError());
  const limit = Math.min(Math.max(Number(req.query.limit ?? 10) || 10, 1), 50);
  try {
    const response = await fetch(`${backendUrl}/api/v1/assessments/history?limit=${limit}`, { headers: { "X-Mission-Control-Key": backendKey }, signal: AbortSignal.timeout(8_000) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return res.status(response.status).json({ error: { kind: "history_unavailable", message: normaliseBackendDetail(payload, "Analysis history is unavailable."), retryable: response.status >= 500 } });
    return res.json(payload);
  } catch {
    return res.status(503).json({ error: { kind: "history_unavailable", message: "Analysis history could not be reached.", retryable: true } });
  }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: { kind: "file_too_large", message: "Image exceeds the 10 MB limit.", retryable: false } });
  return res.status(500).json({ error: { kind: "analysis_failed", message: "TerrainLens could not process this request.", retryable: true } });
});

async function serve() {
  if (process.env.NODE_ENV === "development") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(root, "dist", "client")));
    app.get("*", (_req, res) => res.sendFile(path.join(root, "dist", "client", "index.html")));
  }
  app.listen(port, () => console.log(`TerrainLens listening on http://localhost:${port}`));
}

void serve();
