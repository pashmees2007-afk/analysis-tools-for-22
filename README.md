# Analysis Tools for 22

This repository is a backend-ready terrain-image analysis package. It combines a MobileNetV3–U-Net ONNX segmentation path with a deterministic visual-complexity path that calculates local edge density, Laplacian texture variance, and grayscale contrast. The package contains no user interface, database layer, object-storage client, or web-framework route, so it can be placed behind Express, Fastify, tRPC, a queue worker, or a serverless handler.

## Quick Start

Install dependencies with `pnpm install`, place both supplied ONNX files—`mobilenetv3_unet_v1.onnx` and its adjacent `mobilenetv3_unet_v1.onnx.data` tensor-data file—under `src/models/`, then run `pnpm test` and `pnpm build`. A host backend passes an uploaded file buffer to `analyzeTerrain` and stores the returned PNG buffers wherever it chooses.

```ts
import { analyzeTerrain } from "analysis-tools-for-22";

const result = await analyzeTerrain({
  filename: upload.originalname,
  image: upload.buffer,
  options: { columns: 6, rows: 4 },
});
```

The `model` response contains a 256×256 semantic mask, overlay, class coverage, and model metadata. The `visualComplexity` response contains edge and texture maps, a scored grid, the three highest-ranked review cells, and a grid-overlay PNG. The host application decides whether to save these buffers, return them directly, or convert them into signed URLs.

## Repository Layout

| Path | Purpose |
|---|---|
| `src/modules/model.ts` | ONNX preprocessing, inference, class-mask rendering, and model metadata. |
| `src/modules/vision.ts` | Deterministic visual-complexity measurements and review-cell overlay. |
| `src/index.ts` | One unified request entry point with stable output types. |
| `src/contracts.ts` | Framework-neutral request and response contracts. |
| `docs/backend-example.ts` | An adapter pattern for a host backend. |
| `docs/architecture.md` | Module boundaries and integration design. |
| `docs/model-provenance.md` | Imported model artifact, scope, and limitations. |

## Limitations

The model and visual-complexity outputs are decision-support evidence, not safety assessments, landing recommendations, or proof of ground truth. Visual-complexity scores identify local image edges, texture, and contrast only. They do not prove an area is dangerous or safe, and model results should not be treated as validated for an arbitrary planetary body, sensor, scale, or illumination condition.
