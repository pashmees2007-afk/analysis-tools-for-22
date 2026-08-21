# Analysis Tools for 22: Integration Architecture

## Purpose

`analysis-tools-for-22` is a server-side TypeScript package for terrain-image review. It keeps learned-model segmentation and deterministic computer-vision evidence in separate modules, then combines them in one request handler. A web backend can call one function without inheriting a user interface, database, or storage implementation.

## Module Boundary

| Module | Responsibility | Dependency boundary |
|---|---|---|
| `modules/model` | Resize and normalize the image, run the MobileNetV3–U-Net ONNX model, and return a class mask with class coverage. | `onnxruntime-node`, `sharp` |
| `modules/vision` | Measure Canny edge density, Laplacian texture variance, and grayscale contrast in a six-by-four grid. | `sharp` only; OpenCV-compatible calculations implemented in TypeScript |
| `pipeline` | Decode the image once, invoke both modules, render portable visual outputs, and assemble the response. | Depends only on the two modules |
| `contracts` | Define stable input, output, error, model-provenance, and visual-evidence types for an HTTP, tRPC, REST, queue-worker, or CLI adapter. | No runtime dependency |

## Unified Request

The integration entry point accepts a filename, an image buffer, and optional analysis settings. It does not accept data URLs, user records, database handles, or storage clients. An outer backend owns authentication, upload limits, persistence, and returned URLs.

```ts
const result = await analyzeTerrain({
  filename: "mars-surface.jpg",
  image: uploadBuffer,
  options: { gridColumns: 6, gridRows: 4 },
});
```

## Unified Response

The response contains two deliberately separate evidence blocks. `model` reports the ONNX segmentation result and model metadata. `visualComplexity` reports deterministic texture and contrast measurements, including the highest-ranked review cells. Rendered PNG buffers are returned instead of being written to disk or cloud storage.

```ts
type TerrainAnalysisResult = {
  analysisId: string;
  source: { filename: string; width: number; height: number; png: Buffer };
  model: ModelAnalysisResult;
  visualComplexity: VisualComplexityResult;
  limitations: string[];
};
```

## Backend Adapter Pattern

An application adapter should convert an incoming file to a `Buffer`, call `analyzeTerrain`, upload the returned PNG buffers to its own object storage, and persist selected metadata. This keeps deployment-specific concerns outside the analysis package and avoids coupling the analysis code to tRPC, Express, Drizzle, or a particular database schema.

## Output Semantics

The model mask identifies the four classes encoded by the supplied model: soil, bedrock, sand, and big rock. Visual complexity scores identify image areas with comparatively high local edges, texture, and contrast. Neither evidence block is a safety assessment, landing recommendation, or ground-truth classification for an arbitrary planetary body.
