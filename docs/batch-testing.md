# Batch Testing Without a UI

The batch runner processes every PNG, JPG, JPEG, or WEBP file in an input directory. It invokes the same `analyzeTerrain()` function used by the backend-facing package, so it is suitable for testing the full learned-model and TERRAIN LENS pipeline before a frontend exists.

```bash
pnpm batch -- /path/to/input-images /path/to/batch-output
```

For every input image, the runner creates a numbered output directory containing `source.png`, `model-mask.png`, `model-overlay.png`, `edge-map.png`, `texture-map.png`, and `complexity-overlay.png`. It also writes `batch-summary.json` at the output root.

The summary records each source-image size, model class coverage, top visual-complexity cells, relative artifact paths, and any image-level failures. The runner continues after an individual image fails, then exits with a non-zero code if one or more images could not be processed.

> Batch output demonstrates that the pipeline executed across several images. It does not independently verify that the model’s predicted terrain labels are ground truth.
