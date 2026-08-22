import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import { getHealth, getHistory, requestAnalysis, type Analysis, type HistoryEntry } from "./api";

type Stage = "idle" | "ready" | "analyzing" | "success" | "error";
type ViewMode = "source" | "annotated" | "heatmap";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function metricLabel(key: string) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMetric(value: string | number) {
  return typeof value === "number" ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value) : value;
}

function StatusDot({ connected }: { connected: boolean | null }) {
  const label = connected === null ? "CHECKING API" : connected ? "API CONNECTED" : "API OFFLINE";
  return <span className={`status ${connected === null ? "checking" : connected ? "online" : "offline"}`}><span aria-hidden="true" />{label}</span>;
}

function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [engine, setEngine] = useState<"cv" | "ml">("cv");
  const [target, setTarget] = useState("Mars");
  const [sourceUrl, setSourceUrl] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [view, setView] = useState<ViewMode>("source");
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<boolean | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const refreshHealth = async () => {
    try {
      await getHealth();
      setHealth(true);
    } catch {
      setHealth(false);
    }
  };

  useEffect(() => { void refreshHealth(); }, []);
  useEffect(() => () => { if (sourcePreview) URL.revokeObjectURL(sourcePreview); }, [sourcePreview]);
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "1") setView("source");
      if (event.key === "2" && analysis?.artifacts.annotated) setView("annotated");
      if (event.key === "3" && analysis?.artifacts.heatmap) setView("heatmap");
      if (event.key.toLowerCase() === "r" || event.key.toLowerCase() === "f") setScale(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [analysis]);

  const activeImage = useMemo(() => {
    if (view === "annotated") return analysis?.artifacts.annotated ?? sourcePreview;
    if (view === "heatmap") return analysis?.artifacts.heatmap ?? sourcePreview;
    return sourcePreview;
  }, [analysis, sourcePreview, view]);

  const chooseFile = (candidate: File | undefined) => {
    if (!candidate) return;
    setError(null);
    setAnalysis(null);
    setView("source");
    setScale(1);
    if (!ACCEPTED_TYPES.has(candidate.type)) {
      setFile(null); setStage("error"); setError("Unsupported image format. TerrainLens accepts JPG, PNG, and WEBP."); return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setFile(null); setStage("error"); setError("Image exceeds the 10 MB analysis limit."); return;
    }
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    setFile(candidate);
    setSourcePreview(URL.createObjectURL(candidate));
    setStage("ready");
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0]);
  const handleDrop = (event: DragEvent<HTMLButtonElement>) => { event.preventDefault(); chooseFile(event.dataTransfer.files?.[0]); };
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); };

  const analyse = async () => {
    if (!file) { setStage("error"); setError("Select a terrain image before starting analysis."); return; }
    setStage("analyzing"); setError(null); setAnalysis(null);
    try {
      const result = await requestAnalysis({ file, engine, declaredTarget: target, sourceUrl });
      setAnalysis(result.analysis);
      setView(result.analysis.artifacts.annotated ? "annotated" : "source");
      setStage("success");
      void refreshHealth();
    } catch (requestError) {
      setStage("error");
      setError(requestError instanceof Error ? requestError.message : "TerrainLens could not complete the analysis request.");
      void refreshHealth();
    }
  };

  const loadHistory = async () => {
    setArchiveOpen(true); setHistoryError(null);
    try { setHistory((await getHistory()).history); }
    catch (requestError) { setHistoryError(requestError instanceof Error ? requestError.message : "History is unavailable."); }
  };

  const reset = () => {
    setStage("idle"); setFile(null); setAnalysis(null); setError(null); setView("source"); setScale(1);
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    setSourcePreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const modeAvailable = (mode: ViewMode) => mode === "source" ? Boolean(sourcePreview) : mode === "annotated" ? Boolean(analysis?.artifacts.annotated) : Boolean(analysis?.artifacts.heatmap);

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="wordmark" onClick={reset} aria-label="Return to TerrainLens intake"><span className="mark">TL</span><span>TERRAINLENS<small>PLANETARY EVIDENCE WORKSPACE</small></span></button>
        <nav aria-label="Primary navigation"><a href="#intake">INTAKE</a><a href="#workspace">WORKSPACE</a><button onClick={loadHistory}>ARCHIVE</button></nav>
        <StatusDot connected={health} />
      </header>

      <section id="intake" className={`intake ${stage === "success" ? "compact" : ""}`}>
        <div className="intro">
          <p className="eyebrow">TERRAIN EVIDENCE / 01</p>
          <h1>See the terrain<br />before you <em>interpret</em> it.</h1>
          <p className="lede">Upload planetary terrain imagery for real computer-vision or depth-derived analysis. Results are evidence for review, not landing clearance.</p>
          {analysis?.engine.fallback && <div className="fallback" role="status"><strong>PRIMARY ENGINE DEGRADED</strong><span>ML was unavailable; this result was generated by the CV fallback.</span></div>}
        </div>
        <div className="intake-panel">
          <input ref={inputRef} id="terrain-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
          <button className={`dropzone ${file ? "loaded" : ""}`} onClick={() => inputRef.current?.click()} onDrop={handleDrop} onDragOver={(event) => event.preventDefault()} onKeyDown={handleKey}>
            {sourcePreview ? <img src={sourcePreview} alt="Selected terrain preview" /> : <span className="dropzone-empty"><b>DROP TERRAIN IMAGE</b><small>JPG · PNG · WEBP · MAX 10 MB</small></span>}
            {sourcePreview && <span className="preview-label">{file?.name}</span>}
          </button>
          <div className="config-grid">
            <label>ANALYSIS ENGINE<select value={engine} onChange={(event) => setEngine(event.target.value as "cv" | "ml")}><option value="cv">CV — Visual terrain evidence</option><option value="ml">ML — Depth-derived evidence</option></select></label>
            <label>DECLARED TARGET<select value={target} onChange={(event) => setTarget(event.target.value)}><option>Mars</option><option>Moon</option><option>Earth</option><option>Unknown</option></select></label>
            <label className="source-url">SOURCE URL <input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="Optional provenance URL" inputMode="url" /></label>
          </div>
          <div className="intake-actions">
            {file && <button className="quiet-button" onClick={reset}>REMOVE IMAGE</button>}
            <button className="analyze-button" onClick={analyse} disabled={stage === "analyzing"}>{stage === "analyzing" ? "ANALYSIS IN PROGRESS" : "BEGIN ANALYSIS"}</button>
          </div>
          {stage === "analyzing" && <div className="processing" role="status"><span>REQUEST SUBMITTED</span><span>WAITING FOR ANALYSIS SERVICE</span><span>RENDERING AVAILABLE EVIDENCE</span></div>}
          {stage === "error" && <div className="error-state" role="alert"><strong>ANALYSIS NOT COMPLETED</strong><span>{error}</span><button onClick={() => setStage(file ? "ready" : "idle")}>REVIEW CONFIGURATION</button></div>}
        </div>
      </section>

      <section id="workspace" className={`workspace ${analysis ? "has-result" : ""}`} aria-labelledby="workspace-title">
        <div className="section-heading"><div><p className="eyebrow">EVIDENCE WORKSPACE / 02</p><h2 id="workspace-title">{analysis ? "Investigate returned evidence" : "Awaiting an analysis result"}</h2></div>{analysis && <span className="analysis-status">● COMPLETE · {analysis.engine.executed.toUpperCase()} ENGINE</span>}</div>
        {analysis ? <>
          <div className="viewer-layout">
            <section className="viewer" aria-label="Terrain evidence viewer">
              <div className="mode-rail" role="tablist" aria-label="Evidence modes">
                {(["source", "annotated", "heatmap"] as ViewMode[]).map((mode) => <button key={mode} role="tab" aria-selected={view === mode} disabled={!modeAvailable(mode)} onClick={() => setView(mode)}>{mode === "source" ? "SOURCE" : mode === "annotated" ? "ANALYSIS" : "RISK"}</button>)}
              </div>
              <div className="image-stage">
                {activeImage ? <img src={activeImage} style={{ transform: `scale(${scale})` }} alt={view === "source" ? "Uploaded terrain source" : view === "annotated" ? "Backend annotated terrain evidence" : "Backend risk heatmap"} /> : <p>ARTIFACT NOT AVAILABLE</p>}
                <div className="viewer-controls"><button onClick={() => setScale((current) => Math.min(2.2, current + 0.2))}>+</button><button onClick={() => setScale((current) => Math.max(0.8, current - 0.2))}>−</button><button onClick={() => setScale(1)}>FIT</button></div>
              </div>
              <p className="artifact-caption">{view === "source" ? "LOCAL SOURCE PREVIEW" : view === "annotated" ? "BACKEND-GENERATED ANNOTATED EVIDENCE" : "BACKEND-GENERATED SLOPE / HEURISTIC RISK VISUALIZATION"}</p>
            </section>
            <aside className="evidence-panel">
              <div className="panel-block"><p className="panel-label">EXECUTION</p><dl><div><dt>REQUESTED</dt><dd>{analysis.engine.requested.toUpperCase()}</dd></div><div><dt>EXECUTED</dt><dd>{analysis.engine.executed.toUpperCase()}</dd></div><div><dt>FALLBACK</dt><dd>{analysis.engine.fallback ? "ACTIVE" : "NOT USED"}</dd></div></dl></div>
              <div className="panel-block"><p className="panel-label">RETURNED METRICS</p><dl>{analysis.metrics.length ? analysis.metrics.map((metric) => <div key={metric.key}><dt>{metricLabel(metric.key)}</dt><dd>{formatMetric(metric.value)}</dd></div>) : <p>NOT AVAILABLE</p>}</dl></div>
              <div className="panel-block"><p className="panel-label">LIMITATIONS</p>{analysis.limitations.map((item) => <p className="limitation" key={item}>{item}</p>)}</div>
            </aside>
          </div>
          <section className="zone-section"><div className="zone-header"><div><p className="eyebrow">CANDIDATE ZONES / 03</p><h2>Lower-risk regions returned by the backend</h2></div><p>Coordinates remain in processed-image space. Inspect the annotated artifact before acting on a candidate.</p></div><div className="zone-list">{analysis.safeZones.length ? analysis.safeZones.map((zone) => <article className="zone" key={zone.id}><span className="zone-index">{zone.id}</span><dl><div><dt>POSITION</dt><dd>X {zone.x} / Y {zone.y}</dd></div><div><dt>AREA</dt><dd>{formatMetric(zone.area)} PX²</dd></div><div><dt>AVERAGE RISK</dt><dd>{formatMetric(zone.averageRisk)}</dd></div></dl></article>) : <p className="empty-note">NO CANDIDATE ZONES WERE RETURNED FOR THIS IMAGE.</p>}</div></section>
        </> : <div className="workspace-empty"><span>⌁</span><p>Upload an image and start a real analysis to populate this workspace. TerrainLens does not generate demonstration results.</p></div>}
      </section>

      {archiveOpen && <section className="archive" aria-labelledby="archive-title"><div className="section-heading"><div><p className="eyebrow">MISSION ARCHIVE / 04</p><h2 id="archive-title">Recorded backend audit rows</h2></div><button className="quiet-button" onClick={() => setArchiveOpen(false)}>CLOSE</button></div>{historyError ? <div className="error-state" role="alert"><strong>HISTORY UNAVAILABLE</strong><span>{historyError}</span><button onClick={loadHistory}>RETRY</button></div> : history ? <div className="history-table"><div className="history-row heading"><span>TIME</span><span>REQUESTED ENGINE</span><span>CRATERS</span><span>ROCKS</span><span>TOP CANDIDATE</span></div>{history.length ? history.map((entry) => <div className="history-row" key={entry.id}><span>{entry.timestamp}</span><span>{entry.engine_used.toUpperCase()}</span><span>{entry.craters_found}</span><span>{entry.rocks_found}</span><span>{entry.top_safe_zone_id}</span></div>) : <p className="empty-note">NO BACKEND AUDIT ROWS ARE AVAILABLE.</p>}</div> : <p className="empty-note">LOADING BACKEND AUDIT HISTORY…</p>}</section>}

      <footer><span>TERRAINLENS / EVIDENCE-FIRST INTERFACE</span><span>USE RESULTS WITH SOURCE IMAGERY AND MISSION CONSTRAINTS</span></footer>
    </main>
  );
}

export default App;
