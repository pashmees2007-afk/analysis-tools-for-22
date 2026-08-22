# Accurate Frontend Evidence Contract

Use [`examples/AnalysisEvidencePanel.tsx`](../examples/AnalysisEvidencePanel.tsx) to replace UI placeholders such as `Surface confidence: 100%`, `100% clear`, `Ranks open ground`, and ambiguous `Model gated` text.

The analysis package returns `model.classCoverage` and `visualComplexity.topReviewCells`. The host backend must apply the Mars-source gate before calling the model and return a serializable response with the following additions:

```ts
{
  gate: {
    status: "accepted" | "unknown" | "blocked",
    reason: string,
    runMarsModel: boolean,
    runVisualComplexity: boolean
  },
  model: ModelAnalysisResult | null,
  visualComplexity: VisualComplexityResult | null
}
```

The backend should upload returned PNG buffers to its storage and send URLs such as `model.overlayUrl` and `visualComplexity.overlayUrl` to the frontend. Do not send raw Node.js `Buffer` values to the browser.

## Required Labels

| Backend field | Frontend label |
|---|---|
| `gate.status === "accepted"` | `Mars source verified — terrain model ran.` |
| `gate.status !== "accepted"` | `Mars model withheld — {reason}.` |
| `model.classCoverage[].share` | `Predicted terrain coverage` |
| `visualComplexity.topReviewCells[].score` | `Relative complexity` |

`classCoverage.share` is the fraction of output pixels in each model class. `score` is a relative visual-complexity score within the current image. Neither field is a safety score, a probability of danger, or an accuracy value for that upload.
