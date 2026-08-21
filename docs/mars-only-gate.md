# Python Mars-Only Input Gate

`examples/mars_only_gate.py` is a dependency-free backend example. It is a **provenance and scope gate**, not an automated image classifier. It asks the backend to decide whether the trained Mars model may run before inference starts.

| Gate status | Mars-trained model | Generic visual-complexity analysis | Meaning |
|---|---|---|---|
| `accepted` | Run | Run | The request declares Mars, uses a trusted Mars source URL, and the backend verifies the uploaded bytes against the source bytes. |
| `unknown` | Do not run | Optional | The request declares Mars but does not have a backend-verified source match. |
| `blocked` | Do not run | Optional | The request declares another target, such as the Moon or Earth. |

Use the result in a FastAPI, Flask, or other backend before any Mars-model call:

```python
source_verified = exact_source_match(upload_bytes, canonical_source_bytes)
decision = mars_only_gate(payload.declared_target, payload.source_url, source_verified)

if decision.run_mars_model:
    model_result = run_mars_terrain_model(image_bytes)
else:
    model_result = None

if decision.run_visual_complexity:
    cv_result = run_visual_complexity(image_bytes)
```

The frontend should send a required `declared_target` field and an optional `source_url`, but it must not be the only enforcement point. The backend owns the final call to `mars_only_gate()` so an API request cannot bypass the rule. The backend must fetch or select the canonical image through an approved source workflow and set `source_verified=True` only when `exact_source_match()` confirms that the uploaded bytes are the same bytes.

To support a different trusted archive, add only team-approved domains to `TRUSTED_MARS_SOURCE_DOMAINS`. Do not turn a simple colour or texture heuristic into an automatic planetary identity claim; it is not robust enough to safely authorize the Mars-trained model.

### Quick Image-Byte Test

Use the image-byte edge-case runner to check four real workflow scenarios with a curated Mars file and a lunar file:

```bash
cd examples
python3 gate_image_edge_cases.py /path/to/curated-mars-image.jpg /path/to/lunar-image.jpg
```

It checks a verified Mars image, a lunar image with forged Mars metadata, an altered Mars copy, and an honestly declared lunar image.
