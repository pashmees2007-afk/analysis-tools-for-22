# No-UI Dry-Run Results

## Input

The package was run directly from the command line, without a frontend or backend route. The input was a terrain-only crop from the NASA Curiosity Mastcam reference image documented in [`dry-run-image-source.md`](dry-run-image-source.md).

| Field | Result |
|---|---|
| Source filename | `curiosity-sol19-terrain.jpg` |
| Input dimensions | 220 × 313 pixels |
| Model execution | Successful through ONNX Runtime CPU |
| Visual-complexity execution | Successful with a 6 × 4 grid |
| Generated review artifacts | Source PNG, model mask, model overlay, edge map, texture map, complexity overlay, and JSON summary |

## Trained Terrain Model Output

| Terrain class | Pixel share |
|---|---:|
| Soil | 57.57% |
| Bedrock | 33.18% |
| Sand | 0.00% |
| Big rock | 9.25% |

The generated model overlay shows distinct color regions across the selected terrain crop. It demonstrates that the ONNX model loaded, accepted image input, produced a class map, and rendered a usable overlay without a user interface.

## TERRAIN LENS Visual-Complexity Output

| Rank | Grid cell | Score | Observation |
|---|---|---:|---|
| 1 | Row 4, column 1 | 0.9341 | Lower-left rocky terrain, with strong local texture and edges. |
| 2 | Row 3, column 1 | 0.8680 | Left-side transition between slope and rocky foreground. |
| 3 | Row 4, column 3 | 0.8362 | Textured lower-middle terrain. |

The complexity overlay rendered the three ranked cells with visible colored boxes. This confirms that the deterministic visual-complexity pipeline produced review locations and an inspectable overlay without relying on the model output.

## Conclusion

Both analysis paths completed successfully on a real Mars image without any UI. Rohan’s interface can therefore focus on uploading an image and displaying returned artifacts, while Prajwal’s backend can focus on passing the image buffer to `analyzeTerrain()` and storing or returning the generated files.
