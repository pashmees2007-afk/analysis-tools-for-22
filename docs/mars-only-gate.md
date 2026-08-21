# Python Mars-Only Input Gate

`examples/mars_only_gate.py` is a dependency-free backend example. It is a **provenance and scope gate**, not an automated image classifier. It asks the backend to decide whether the trained Mars model may run before inference starts.

| Gate status | Mars-trained model | Generic visual-complexity analysis | Meaning |
|---|---|---|---|
| `accepted` | Run | Run | The request declares Mars and supplies a trusted Mars source URL. |
| `unknown` | Do not run | Optional | The request declares Mars but lacks a trusted source URL. |
| `blocked` | Do not run | Optional | The request declares another target, such as the Moon or Earth. |

Use the result in a FastAPI, Flask, or other backend before any Mars-model call:

```python
decision = mars_only_gate(payload.declared_target, payload.source_url)

if decision.run_mars_model:
    model_result = run_mars_terrain_model(image_bytes)
else:
    model_result = None

if decision.run_visual_complexity:
    cv_result = run_visual_complexity(image_bytes)
```

The frontend should send a required `declared_target` field and an optional `source_url`, but it must not be the only enforcement point. The backend owns the final call to `mars_only_gate()` so an API request cannot bypass the rule.

To support a different trusted archive, add only team-approved domains to `TRUSTED_MARS_SOURCE_DOMAINS`. Do not turn a simple colour or texture heuristic into an automatic planetary identity claim; it is not robust enough to safely authorize the Mars-trained model.
