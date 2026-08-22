# TerrainLens Frontend

TerrainLens is a new React and TypeScript terrain-evidence interface built from scratch for this repository. It does not reuse a frontend from another project.

The browser talks only to the TerrainLens server routes. Those routes proxy the existing FastAPI backend and keep `BACKEND_API_KEY` server-only. Never place that key in Vite client variables or browser code.

## Current functionality

TerrainLens provides real local image intake for JPG, PNG, and WEBP files up to 10 MB; explicit CV and ML engine selection; target declaration and optional provenance URL fields; live backend-health state; real multipart submission through a server-side proxy; returned annotated and heatmap evidence views; aggregate metrics; candidate-zone data; fallback disclosure; backend audit history; and explicit error states.

The current FastAPI backend does not yet return individual detection geometry, source/processed image dimensions, semantic masks, visual-complexity review cells, persisted artifacts, or full historic analysis records. TerrainLens intentionally labels those capabilities as unavailable rather than inventing results.

## Local configuration

Copy the template locally and set the server-only backend connection values:

```bash
cp .env.example .env
# Edit .env with the private backend URL and API key.
```

The frontend is intentionally isolated from the parent Node analysis package during dependency installation:

```bash
pnpm install --ignore-workspace --ignore-scripts
pnpm dev
```

For validation, use the local toolchain:

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/vite build
```

## Routes

| TerrainLens route | Purpose |
|---|---|
| `GET /api/terrainlens/health` | Server-side proxy of FastAPI health status. |
| `POST /api/terrainlens/analyses` | Validates and forwards a multipart terrain request, then normalizes the response. |
| `GET /api/terrainlens/history` | Returns the limited audit history exposed by the current backend. |

## Evidence language

Returned images, metrics, and candidate zones are analysis evidence for human review. They do not establish safety, suitability, or mission clearance.
