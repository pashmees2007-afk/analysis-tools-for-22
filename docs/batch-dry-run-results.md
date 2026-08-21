# Batch Dry-Run Results

The batch runner was tested without a UI on two Mars-terrain image inputs. Both completed through the unified analysis package with no image-level failures.

| Input | Source dimensions | Batch outcome | Generated artifact set |
|---|---:|---|---|
| `curiosity-honeycomb-terrain.jpg` | 1500 × 900 | Successful | Source, model mask, model overlay, edge map, texture map, and complexity overlay |
| `curiosity-sol19-terrain.jpg` | 220 × 313 | Successful | Source, model mask, model overlay, edge map, texture map, and complexity overlay |

The generated `batch-summary.json` contained two successful records and zero failures. For each image, it recorded the source dimensions, terrain-class coverage, the top three visual-complexity cells, and relative paths to the six output artifacts.

The second image’s model overlay rendered class regions at the required 256 × 256 model input size. Its complexity overlay rendered the top three ranked review regions across the textured foreground. This confirms that the command runs both analysis paths once per input image and keeps their output artifacts separate by image.

Run the same command on any folder of PNG, JPG, JPEG, or WEBP inputs:

```bash
pnpm batch -- /path/to/input-images /path/to/batch-output
```
