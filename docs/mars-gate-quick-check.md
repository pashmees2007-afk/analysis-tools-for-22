# Quick Mars-Source Gate Check

The hardened gate was tested with a curated Mars terrain crop and a lunar-surface image in four practical scenarios.

| Scenario | Expected model action | Result |
|---|---|---|
| Exact curated Mars image | Run | `accepted`; model runs |
| Lunar image with forged Mars metadata | Skip | `unknown`; model skips |
| Mars file with altered bytes | Skip | `unknown`; model skips |
| Honest lunar declaration | Skip | `blocked`; model skips |

All four checks passed. The test validates the gate’s provenance rule: the Mars-trained model can run only when the submitted bytes exactly match the approved Mars source bytes held by the backend.

This does not identify planets visually. It is intentionally a backend provenance safeguard. Treat unverified uploads as `unknown` and use only optional generic visual-complexity analysis for them.
