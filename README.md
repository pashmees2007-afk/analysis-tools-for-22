# Analysis Tools for 22

**Analysis Tools for 22** is a backend-ready package for reviewing terrain images with two separate kinds of evidence. One path uses a trained semantic-terrain model to label pixels. The other uses deterministic computer-vision measurements to highlight visually complex parts of the image. A backend can call one function, receive both outputs, and decide how to store or display the artifacts.

> The two tools are complementary. They do not need to agree, and neither one is a safety decision or landing recommendation.

## The Two Analysis Tools

| Tool | What it does | Main output | Best use |
|---|---|---|---|
| **Trained Terrain Model** | Runs the supplied MobileNetV3–U-Net ONNX model on a normalized 256 × 256 RGB version of the image. | A four-class pixel mask, blended overlay, and class coverage for soil, bedrock, sand, and big rock. | Reviewing the model’s terrain-class evidence. |
| **TERRAIN LENS Visual Complexity** | Uses deterministic computer-vision measurements: edge density, Laplacian texture variance, and grayscale contrast. | Edge and texture maps, a 6 × 4 review grid, a ranked top three, and a colored grid overlay. | Finding areas in the image that deserve closer human inspection. |

The trained-model path is model-based: it uses learned weights in the two files under `src/models/`. The TERRAIN LENS path does not use those weights or any trained model. It calculates its image measurements directly from the uploaded pixels.

## What Happens to an Uploaded Image

The `analyzeTerrain()` function rotation-corrects the input and converts it into a PNG. It sends that source image to both analysis modules at the same time. The model module produces semantic class evidence, while the visual-complexity module scores each grid cell relative to the other cells in the same image. The final response returns the normalized source image, generated PNG buffers, structured metadata, top review cells, and limitations.

```ts
import { analyzeTerrain } from "analysis-tools-for-22";

const result = await analyzeTerrain({
  filename: upload.originalname,
  image: upload.buffer,
  options: { columns: 6, rows: 4 },
});

// result.model: trained-model mask, overlay, and coverage
// result.visualComplexity: edges, texture, grid scores, and top review cells
```

The package intentionally has no built-in web route, authentication, database, or cloud-storage client. Your backend owns those concerns. A simple adapter can convert a framework upload to a `Buffer`, call `analyzeTerrain()`, upload the returned PNG buffers, and save the metadata. See [`docs/backend-example.ts`](docs/backend-example.ts) for a small adapter example.

## Outputs Returned to a Backend

| Result area | Included data |
|---|---|
| `source` | Original filename, dimensions, and normalized PNG buffer. |
| `model` | Model metadata, terrain-class coverage, mask PNG, and model-overlay PNG. |
| `visualComplexity` | Edge-map PNG, texture-map PNG, colored review-grid overlay, every scored cell, and the top three review cells. |
| `limitations` | Plain-language statements that a host application can display to users. |

## Install and Verify

The package requires Node.js 22 or later. Install the dependencies, keep both model files together, then run the checks.

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

Both model files must be present under `src/models/`:

```text
src/models/mobilenetv3_unet_v1.onnx
src/models/mobilenetv3_unet_v1.onnx.data
```

The `.onnx.data` file contains external tensor data required by the ONNX model; it must stay beside the `.onnx` file in development and in the deployment build.

## Batch Test Multiple Images

To test a folder of images before the UI exists, run the batch command. It writes separate model and visual-complexity artifacts for every PNG, JPG, JPEG, or WEBP file, plus one `batch-summary.json` file.

```bash
pnpm batch -- /path/to/input-images /path/to/batch-output
```

See [`docs/batch-testing.md`](docs/batch-testing.md) for the output structure and failure handling.
The command was verified on two Mars-terrain inputs; see [`docs/batch-dry-run-results.md`](docs/batch-dry-run-results.md).

## Mars-Only Gate

The trained model should run only when the backend accepts an image as a Mars input. The repository includes a small Python example that returns `accepted`, `unknown`, or `blocked` and preserves generic visual-complexity analysis for non-Mars or unverified images. A trusted URL alone is not enough: the backend must verify that the uploaded bytes match an approved source image. See [`examples/mars_only_gate.py`](examples/mars_only_gate.py), [`docs/mars-only-gate.md`](docs/mars-only-gate.md), and the [`adversarial dry-run`](docs/mars-gate-adversarial-dry-run.md).

## Judge Guide

For a plain-English walkthrough of the full analysis layer, including model specifications, evaluation metrics, computer-vision basics, source verification, limitations, and ready-to-use judge answers, see [`docs/judge-guide-analysis-tool.md`](docs/judge-guide-analysis-tool.md).

## Frontend Evidence Labels

Use [`examples/AnalysisEvidencePanel.tsx`](examples/AnalysisEvidencePanel.tsx) and [`docs/frontend-evidence-contract.md`](docs/frontend-evidence-contract.md) to render verified model coverage, visual-complexity review cells, and source-gate status without inventing misleading confidence or safety labels.

## Repository Map

| Path | Purpose |
|---|---|
| `src/index.ts` | The single `analyzeTerrain()` entry point. |
| `src/contracts.ts` | Framework-neutral request and response types. |
| `src/modules/model.ts` | Trained-model preprocessing, inference, mask rendering, and metadata. |
| `src/modules/vision.ts` | TERRAIN LENS edge, texture, contrast, grid ranking, and overlay logic. |
| `docs/backend-example.ts` | Example of adapting the package to an upload endpoint. |
| `docs/architecture.md` | Module boundaries and backend integration design. |
| `docs/model-provenance.md` | Model provenance and detailed scope notes. |

## Interpretation and Limits

The supplied model was evaluated on a fixed AI4Mars MSL dataset split; that evaluation does not establish accuracy for every new image, camera, terrain body, lighting condition, or mission context. AI4Mars is a NASA dataset for terrain-aware autonomous-driving research. [1]

The computer-vision output finds **visual complexity only**. It does not prove that an area is dangerous or safe. The learned-model output is also evidence for review, not a validated conclusion about terrain safety, rover operations, or landing suitability.

## References

[1] [NASA Open Data Portal, *AI4MARS: A Dataset for Terrain-Aware Autonomous Driving on Mars*](https://data.nasa.gov/dataset/ai4mars-a-dataset-for-terrain-aware-autonomous-driving-on-mars)
