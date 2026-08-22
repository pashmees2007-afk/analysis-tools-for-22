import type { ReactNode } from "react";

/**
 * API shape the backend should return after it applies the Mars-source gate.
 * Buffers from the analysis package should be uploaded by the backend and
 * returned as URLs; this component intentionally does not render raw buffers.
 */
export type AnalysisEvidenceResponse = {
  gate: {
    status: "accepted" | "unknown" | "blocked";
    reason: string;
    runMarsModel: boolean;
    runVisualComplexity: boolean;
  };
  model: null | {
    classCoverage: Array<{
      className: string;
      share: number; // 0..1 share of pixels, not a confidence probability.
    }>;
    overlayUrl?: string;
  };
  visualComplexity: null | {
    overlayUrl?: string;
    topReviewCells: Array<{
      rank: number;
      row: number;
      column: number;
      score: number; // Relative within-image complexity score, not confidence.
    }>;
  };
  limitations: string[];
};

function percent(value: number) {
  return new Intl.NumberFormat("en", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function GateStatus({ gate }: { gate: AnalysisEvidenceResponse["gate"] }) {
  if (gate.status === "accepted") {
    return (
      <p className="text-sm text-emerald-300">
        Mars source verified — terrain model ran.
      </p>
    );
  }

  return (
    <p className="text-sm text-amber-200">
      Mars model withheld — {gate.reason}. Generic visual-complexity evidence may still be shown.
    </p>
  );
}

function Panel({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">{eyebrow}</p>
      <h2 className="mt-2 font-serif text-2xl text-stone-100">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * Replace misleading labels such as “surface confidence: 100%”,
 * “100% clear”, “ranks open ground”, and “model gated” with this panel.
 */
export function AnalysisEvidencePanel({ result }: { result: AnalysisEvidenceResponse }) {
  const hasModelOutput = result.gate.runMarsModel && result.model !== null;
  const hasCvOutput = result.gate.runVisualComplexity && result.visualComplexity !== null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-orange-300/20 bg-orange-300/5 px-4 py-3">
        <GateStatus gate={result.gate} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Trained terrain model" title={hasModelOutput ? "Predicted terrain coverage" : "Model result unavailable"}>
          {hasModelOutput ? (
            <>
              <p className="mb-4 text-sm leading-6 text-stone-400">
                These values are the share of image pixels assigned to each terrain class. They are not safety scores or per-image accuracy.
              </p>
              <dl className="space-y-3">
                {result.model.classCoverage.map((item) => (
                  <div key={item.className} className="flex items-center justify-between border-b border-white/10 pb-3">
                    <dt className="capitalize text-stone-300">{item.className}</dt>
                    <dd className="font-medium text-stone-50">{percent(item.share)}</dd>
                  </div>
                ))}
              </dl>
              {result.model.overlayUrl ? (
                <img className="mt-5 w-full rounded-xl border border-white/10" src={result.model.overlayUrl} alt="Terrain model overlay" />
              ) : null}
            </>
          ) : (
            <p className="text-stone-400">The Mars-trained model was not run because the image source was not verified as an approved Mars input.</p>
          )}
        </Panel>

        <Panel eyebrow="Visual complexity" title={hasCvOutput ? "Top review cells" : "Visual evidence unavailable"}>
          {hasCvOutput ? (
            <>
              <p className="mb-4 text-sm leading-6 text-stone-400">
                A higher score means this area is relatively more visually complex within this image. It does not mean danger or safety.
              </p>
              <ol className="space-y-3">
                {result.visualComplexity.topReviewCells.map((cell) => (
                  <li key={`${cell.row}-${cell.column}`} className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-stone-300">#{cell.rank} — Review cell {cell.row}.{cell.column}</span>
                    <span className="font-medium text-stone-50">Relative complexity {cell.score.toFixed(2)}</span>
                  </li>
                ))}
              </ol>
              {result.visualComplexity.overlayUrl ? (
                <img className="mt-5 w-full rounded-xl border border-white/10" src={result.visualComplexity.overlayUrl} alt="Visual-complexity review overlay" />
              ) : null}
            </>
          ) : (
            <p className="text-stone-400">No visual-complexity result was returned for this analysis.</p>
          )}
        </Panel>
      </div>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">Interpretation limits</p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-400">
          {result.limitations.map((limitation) => (
            <li key={limitation}>• {limitation}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
