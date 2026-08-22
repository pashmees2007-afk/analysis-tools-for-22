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

function StatusLight({ connected }: { connected: boolean | null }) {
  const label = connected === null ? "LINK_CHECK" : connected ? "LINK_NOMINAL" : "LINK_UNREACHABLE";
  return <span className={`status-light ${connected === null ? "checking" : connected ? "online" : "offline"}`}><i aria-hidden="true" />{label}</span>;
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
    try { await getHealth(); setHealth(true); } catch { setHealth(false); }
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

  const systemEvents = useMemo(() => [
    health === true ? "BUS / BACKEND_LINK_ESTABLISHED" : health === false ? "BUS / BACKEND_LINK_UNAVAILABLE" : "BUS / BACKEND_LINK_CHECKING",
    `SESSION / ${stage.toUpperCase()}`,
    file ? `BUFFER / TERRAIN_IMAGE_STAGED — ${file.name}` : "BUFFER / AWAITING_TERRAIN_IMAGE",
    `CONFIG / ENGINE_${engine.toUpperCase()} // TARGET_${target.toUpperCase()}`,
    analysis ? `RESULT / ${analysis.engine.executed.toUpperCase()}_EVIDENCE_REGISTERED` : "RESULT / NO_EVIDENCE_REGISTERED",
    analysis?.engine.fallback ? "ALERT / ML_DEGRADED — CV_FALLBACK_ACTIVE" : "ALERT / NO_ENGINE_FALLBACK",
  ], [analysis, engine, file, health, stage, target]);

  const chooseFile = (candidate: File | undefined) => {
    if (!candidate) return;
    setError(null); setAnalysis(null); setView("source"); setScale(1);
    if (!ACCEPTED_TYPES.has(candidate.type)) { setFile(null); setStage("error"); setError("Unsupported image format. TerrainLens accepts JPG, PNG, and WEBP."); return; }
    if (candidate.size > MAX_FILE_SIZE) { setFile(null); setStage("error"); setError("Image exceeds the 10 MB analysis limit."); return; }
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    setFile(candidate); setSourcePreview(URL.createObjectURL(candidate)); setStage("ready");
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0]);
  const handleDrop = (event: DragEvent<HTMLButtonElement>) => { event.preventDefault(); chooseFile(event.dataTransfer.files?.[0]); };
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); };

  const analyse = async () => {
    if (!file) { setStage("error"); setError("Select a terrain image before starting analysis."); return; }
    setStage("analyzing"); setError(null); setAnalysis(null);
    try {
      const result = await requestAnalysis({ file, engine, declaredTarget: target, sourceUrl });
      setAnalysis(result.analysis); setView(result.analysis.artifacts.annotated ? "annotated" : "source"); setStage("success"); void refreshHealth();
    } catch (requestError) { setStage("error"); setError(requestError instanceof Error ? requestError.message : "TerrainLens could not complete the analysis request."); void refreshHealth(); }
  };

  const loadHistory = async () => {
    setArchiveOpen(true); setHistoryError(null);
    try { setHistory((await getHistory()).history); } catch (requestError) { setHistoryError(requestError instanceof Error ? requestError.message : "History is unavailable."); }
  };

  const reset = () => {
    setStage("idle"); setFile(null); setAnalysis(null); setError(null); setView("source"); setScale(1);
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    setSourcePreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const modeAvailable = (mode: ViewMode) => mode === "source" ? Boolean(sourcePreview) : mode === "annotated" ? Boolean(analysis?.artifacts.annotated) : Boolean(analysis?.artifacts.heatmap);

  return (
    <main className="terminal-shell">
      <div className="matrix-layer" aria-hidden="true"><span>00110110&nbsp;&nbsp;TERRAINLENS&nbsp;&nbsp;01100100&nbsp;&nbsp;EVIDENCE&nbsp;&nbsp;01010011&nbsp;&nbsp;UPLINK&nbsp;&nbsp;00110110</span><span>NO_SIMULATED_RESULTS // SOURCE_REQUIRED // INSPECT_BEFORE_INTERPRETATION</span></div>
      <header className="terminal-header">
        <button className="terminal-brand" onClick={reset} aria-label="Reset TerrainLens session"><b>TL</b><span>TERRAINLENS<small>OPERATIONAL TERRAIN TERMINAL</small></span></button>
        <div className="header-readout"><span>NODE: TL-01</span><span>SESSION: {stage.toUpperCase()}</span><StatusLight connected={health} /></div>
      </header>

      <section className="workbench" aria-label="TerrainLens command workstation">
        <aside className="left-rack">
          <div className="rack-title"><span>01</span> COMMAND_DECK</div>
          <div className="rack-block">
            <p>INPUT_BUFFER</p>
            <strong>{file ? "IMAGE_STAGED" : "EMPTY"}</strong>
            <small>{file ? file.name : "DROP_OR_SELECT_FILE"}</small>
          </div>
          <div className="rack-block">
            <p>ENGINE_ROUTE</p>
            <strong>{engine.toUpperCase()}</strong>
            <small>{engine === "cv" ? "CLASSICAL_VISUAL_EVIDENCE" : "DEPTH_DERIVED_EVIDENCE"}</small>
          </div>
          <div className="rack-block">
            <p>UPLINK</p>
            <strong className={health ? "ok" : "bad"}>{health ? "NOMINAL" : "OFFLINE"}</strong>
            <button onClick={refreshHealth}>RECHECK_LINK</button>
          </div>
          <div className="signal-meter" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <button className="archive-command" onClick={loadHistory}>OPEN_AUDIT_ARCHIVE <span>↗</span></button>
        </aside>

        <section className="main-terminal">
          <div className="terminal-bar"><span>TL:// COMMAND WINDOW</span><span>{analysis ? "EVIDENCE_REGISTERED" : "STANDBY"}</span></div>
          <div className="terminal-content">
            <div className="command-prompt"><span>&gt;</span><span>ACQUIRE_TERRAIN_IMAGE</span><i /></div>
            <input ref={inputRef} id="terrain-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
            <button className={`input-buffer ${file ? "loaded" : ""}`} onClick={() => inputRef.current?.click()} onDrop={handleDrop} onDragOver={(event) => event.preventDefault()} onKeyDown={handleKey}>
              {sourcePreview ? <img src={sourcePreview} alt="Selected terrain preview" /> : <span className="buffer-empty"><b>[ DROP TERRAIN BUFFER ]</b><small>ACCEPTS JPG / PNG / WEBP // MAX 10 MB</small></span>}
              {sourcePreview && <span className="file-tag">FILE_LOADED :: {file?.name}</span>}
              <span className="corner top-left" /><span className="corner top-right" /><span className="corner bottom-left" /><span className="corner bottom-right" />
            </button>
            <div className="command-grid">
              <label><span>ENGINE</span><select value={engine} onChange={(event) => setEngine(event.target.value as "cv" | "ml")}><option value="cv">CV // VISUAL_EVIDENCE</option><option value="ml">ML // DEPTH_EVIDENCE</option></select></label>
              <label><span>TARGET</span><select value={target} onChange={(event) => setTarget(event.target.value)}><option>Mars</option><option>Moon</option><option>Earth</option><option>Unknown</option></select></label>
              <label className="full"><span>SOURCE_URL // OPTIONAL</span><input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://provenance.source/terrain-image" inputMode="url" /></label>
            </div>
            <div className="command-actions">
              <button className="reset-command" onClick={reset}>CLEAR_BUFFER</button>
              <button className="execute-command" onClick={analyse} disabled={stage === "analyzing"}>{stage === "analyzing" ? "EXECUTING…" : "EXECUTE_ANALYSIS"}<span>↵</span></button>
            </div>
            {stage === "analyzing" && <div className="execution-stream" role="status"><span>01 / BUFFER_VALIDATED</span><span>02 / REQUEST_DISPATCHED</span><span>03 / WAITING_FOR_BACKEND</span></div>}
            {stage === "error" && <div className="terminal-error" role="alert"><strong>! REQUEST_HALTED</strong><span>{error}</span><button onClick={() => setStage(file ? "ready" : "idle")}>ACKNOWLEDGE</button></div>}
          </div>
        </section>

        <aside className="right-rack">
          <div className="rack-title"><span>02</span> LIVE_EVENT_BUS</div>
          <ol className="event-stream">{systemEvents.map((event, index) => <li key={event}><b>{String(index + 1).padStart(2, "0")}</b><span>{event}</span></li>)}</ol>
          <div className="status-diagram" aria-hidden="true"><span /><span /><span /><span /><i /></div>
          <div className="keymap"><span>1 / SOURCE</span><span>2 / ANALYSIS</span><span>3 / RISK</span><span>R / RESET_VIEW</span></div>
        </aside>
      </section>

      <section className="evidence-terminal" aria-labelledby="evidence-heading">
        <div className="section-bar"><span id="evidence-heading">03 // EVIDENCE_CONSOLE</span><span>{analysis ? "RESULT_CHANNEL_OPEN" : "NO_RESULT_CHANNEL"}</span></div>
        {analysis ? <div className="evidence-grid">
          <section className="viewer-module">
            <div className="view-tabs" role="tablist" aria-label="Available evidence artifacts">
              {(["source", "annotated", "heatmap"] as ViewMode[]).map((mode, index) => <button key={mode} role="tab" aria-selected={view === mode} disabled={!modeAvailable(mode)} onClick={() => setView(mode)}>{index + 1} / {mode.toUpperCase()}</button>)}
            </div>
            <div className="evidence-frame">
              {activeImage ? <img src={activeImage} style={{ transform: `scale(${scale})` }} alt={view === "source" ? "Uploaded terrain source" : view === "annotated" ? "Backend annotated terrain evidence" : "Backend risk heatmap"} /> : <p>ARTIFACT_NOT_AVAILABLE</p>}
              <div className="frame-tools"><button onClick={() => setScale((current) => Math.min(2.2, current + 0.2))}>ZOOM +</button><button onClick={() => setScale((current) => Math.max(0.8, current - 0.2))}>ZOOM −</button><button onClick={() => setScale(1)}>FIT</button></div>
            </div>
            <p className="artifact-status">CHANNEL: {view.toUpperCase()} // {modeAvailable(view) ? "ACTIVE" : "NOT_AVAILABLE"}</p>
          </section>
          <aside className="data-module">
            <div><p>ENGINE_EXECUTION</p><dl><dt>REQUESTED</dt><dd>{analysis.engine.requested.toUpperCase()}</dd><dt>EXECUTED</dt><dd>{analysis.engine.executed.toUpperCase()}</dd><dt>FALLBACK</dt><dd>{analysis.engine.fallback ? "ACTIVE" : "NONE"}</dd></dl></div>
            <div><p>RETURNED_METRICS</p><dl>{analysis.metrics.length ? analysis.metrics.map((metric) => <span key={metric.key}><dt>{metricLabel(metric.key)}</dt><dd>{formatMetric(metric.value)}</dd></span>) : <em>NOT_AVAILABLE</em>}</dl></div>
            {analysis.engine.fallback && <div className="degraded-notice">ML_ENGINE_DEGRADED // CV_FALLBACK_RESULT</div>}
          </aside>
        </div> : <div className="console-empty"><div><span>&gt; AWAITING_REAL_ANALYSIS_OUTPUT</span><span>THE EVIDENCE CONSOLE REMAINS EMPTY UNTIL THE BACKEND RETURNS A RESULT.</span><i /></div></div>}
      </section>

      {analysis && <section className="zones-terminal"><div className="section-bar"><span>04 // CANDIDATE_ZONE_REGISTER</span><span>BACKEND_RETURNED_COORDINATES</span></div><div className="zone-register">{analysis.safeZones.length ? analysis.safeZones.map((zone) => <article key={zone.id}><b>{zone.id}</b><span>POS_X {zone.x}</span><span>POS_Y {zone.y}</span><span>AREA {formatMetric(zone.area)} PX²</span><span>AVG_RISK {formatMetric(zone.averageRisk)}</span></article>) : <p>NO_CANDIDATE_ZONES_RETURNED</p>}</div><p className="terminal-note">Coordinates remain in the backend’s processed-image space. Review the returned artifact; this interface does not present candidate zones as clearance or certainty.</p></section>}

      {archiveOpen && <section className="archive-terminal" aria-labelledby="archive-heading"><div className="section-bar"><span id="archive-heading">05 // AUDIT_ARCHIVE</span><button onClick={() => setArchiveOpen(false)}>CLOSE_CHANNEL</button></div>{historyError ? <div className="terminal-error"><strong>! ARCHIVE_UNAVAILABLE</strong><span>{historyError}</span><button onClick={loadHistory}>RETRY</button></div> : history ? <div className="archive-table"><div className="archive-row archive-head"><span>STAMP</span><span>ENGINE</span><span>CRATERS</span><span>ROCKS</span><span>TOP_ZONE</span></div>{history.length ? history.map((entry) => <div className="archive-row" key={entry.id}><span>{entry.timestamp}</span><span>{entry.engine_used.toUpperCase()}</span><span>{entry.craters_found}</span><span>{entry.rocks_found}</span><span>{entry.top_safe_zone_id}</span></div>) : <p>NO_AUDIT_ROWS_AVAILABLE</p>}</div> : <p className="archive-loading">READING_BACKEND_AUDIT_LOG…</p>}</section>}

      <footer className="terminal-footer"><span>TERRAINLENS // LIVE_INTERFACE</span><span>NO_SIMULATED_ANALYSIS_RESULTS</span><span>INSPECT_SOURCE_BEFORE_INTERPRETATION</span></footer>
    </main>
  );
}

export default App;
