/**
 * Terrain Signal Desk — Landing Zone Edition.
 * The visual system keeps the evidence-first, field-journal character while making
 * landing decisions visible through a real 5×5 risk grid derived from the saved sample.
 */
import { Button } from "@/components/ui/button";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleDotDashed,
  Crosshair,
  FileImage,
  FlaskConical,
  Grid3X3,
  Info,
  Layers3,
  MapPinned,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { ChangeEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const assets = {
  hero: "/manus-storage/mars-terrain-hero_bb6c1127.jpg",
  fieldPlate: "/manus-storage/mars-detection-fieldplate_9dab9fbe.jpg",
  texture: "/manus-storage/regolith-paper-texture_c6c6a5a5.jpg",
  detail: "/manus-storage/mars-analysis-detail_1dacff31.jpg",
  mark: "/manus-storage/terrain-signal-mark_7107ec4d.png",
  sampleOriginal: "/manus-storage/curiosity_image_01_95938ea6.png",
  sampleAnnotated: "/manus-storage/curiosity_image_01_annotated_71856f00.png",
};

type RiskCell = {
  id: string;
  row: number;
  col: number;
  risk: number;
  edgeDensity: number;
  circlePressure: number;
  classification: "Preferred" | "Conditional" | "Avoid";
};

const riskCells: RiskCell[] = [
  ["A1", 0, 0, 4, 0.0372, 2.0353, "Conditional"], ["A2", 0, 1, 5, 0.0316, 2.6818, "Conditional"], ["A3", 0, 2, 5, 0.0206, 2.7229, "Conditional"], ["A4", 0, 3, 4, 0.0208, 2.1925, "Conditional"], ["A5", 0, 4, 3, 0.0277, 1.4768, "Preferred"],
  ["B1", 1, 0, 6, 0.0849, 3.0093, "Avoid"], ["B2", 1, 1, 9, 0.1206, 4.5182, "Avoid"], ["B3", 1, 2, 9, 0.1372, 4.644, "Avoid"], ["B4", 1, 3, 8, 0.126, 3.537, "Avoid"], ["B5", 1, 4, 5, 0.0797, 2.182, "Conditional"],
  ["C1", 2, 0, 6, 0.0757, 3.0356, "Avoid"], ["C2", 2, 1, 8, 0.051, 4.7446, "Avoid"], ["C3", 2, 2, 8, 0.0613, 4.6897, "Avoid"], ["C4", 2, 3, 7, 0.0679, 3.9577, "Avoid"], ["C5", 2, 4, 5, 0.074, 2.3928, "Conditional"],
  ["D1", 3, 0, 4, 0, 2.079, "Conditional"], ["D2", 3, 1, 4, 0, 2.8096, "Conditional"], ["D3", 3, 2, 5, 0.0048, 2.9307, "Conditional"], ["D4", 3, 3, 4, 0.0143, 2.5191, "Conditional"], ["D5", 3, 4, 3, 0.0048, 1.7252, "Preferred"],
  ["E1", 4, 0, 3, 0, 1.2433, "Preferred"], ["E2", 4, 1, 3, 0, 1.5639, "Preferred"], ["E3", 4, 2, 3, 0, 1.6362, "Preferred"], ["E4", 4, 3, 3, 0, 1.4378, "Preferred"], ["E5", 4, 4, 2, 0.0083, 1.0664, "Preferred"],
].map(([id, row, col, risk, edgeDensity, circlePressure, classification]) => ({
  id: id as string,
  row: row as number,
  col: col as number,
  risk: risk as number,
  edgeDensity: edgeDensity as number,
  circlePressure: circlePressure as number,
  classification: classification as RiskCell["classification"],
}));

const riskStyles: Record<RiskCell["classification"], { background: string; text: string; border: string; label: string }> = {
  Preferred: { background: "rgba(106, 151, 86, 0.52)", text: "#eff9e9", border: "#d5f0c7", label: "Preferred" },
  Conditional: { background: "rgba(194, 143, 57, 0.48)", text: "#fff6dc", border: "#fde0a5", label: "Review" },
  Avoid: { background: "rgba(190, 67, 41, 0.58)", text: "#fff1ec", border: "#ffb6a6", label: "Avoid" },
};

function classifyReason(cell: RiskCell) {
  if (cell.classification === "Preferred") return "Lowest combined candidate-circle pressure and sparse high-contrast edge response in the verified sample.";
  if (cell.classification === "Conditional") return "Moderate hazard pattern. Review terrain relief and surrounding cells before committing a landing path.";
  return "Elevated candidate-circle pressure and/or dense edge activity suggest a more cluttered, higher-risk approach area.";
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="border-l border-[#D4C7B5] pl-4 first:border-l-0 first:pl-0"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6D6258]">{label}</p><p className="mt-1 font-mono text-2xl font-medium tracking-[-0.06em] text-[#27221E]">{value}</p><p className="mt-1 text-xs text-[#817468]">{note}</p></div>;
}

function RiskGrid({ selected, setSelected, visible }: { selected: string; setSelected: (id: string) => void; visible: boolean }) {
  return (
    <div className={`absolute inset-0 grid grid-cols-5 grid-rows-5 transition-opacity duration-200 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}>
      {riskCells.map((cell) => {
        const style = riskStyles[cell.classification];
        const isSelected = cell.id === selected;
        return <button
          key={cell.id}
          aria-label={`${cell.id}, risk score ${cell.risk} of 10, ${cell.classification}`}
          onClick={() => setSelected(cell.id)}
          className="relative flex min-h-0 flex-col justify-between border border-white/40 p-1.5 text-left transition-all duration-150 hover:brightness-110 sm:p-2.5"
          style={{ background: style.background, color: style.text, boxShadow: isSelected ? `inset 0 0 0 3px ${style.border}, 0 0 0 1px rgba(0,0,0,.3)` : undefined }}
        >
          <span className="font-mono text-[9px] font-medium tracking-[0.12em] drop-shadow-sm sm:text-[11px]">{cell.id}</span>
          <span className="self-end font-mono text-lg font-medium tracking-[-0.08em] drop-shadow-sm sm:text-2xl">{cell.risk}</span>
          {cell.id === "E5" && <span className="absolute bottom-1 left-1 rounded-full bg-[#1f3b2a]/80 px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-[0.1em] text-[#e7f7dd] sm:bottom-2 sm:left-2 sm:text-[8px]">Primary</span>}
        </button>;
      })}
    </div>
  );
}

export default function Home() {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState("E5");
  const [layer, setLayer] = useState<"risk" | "hazards" | "raw">("risk");
  const [gridVisible, setGridVisible] = useState(true);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState("");
  const [cannyLow, setCannyLow] = useState(50);
  const [cannyHigh, setCannyHigh] = useState(150);
  const [circleEvidence, setCircleEvidence] = useState(50);

  const selected = useMemo(() => riskCells.find((cell) => cell.id === selectedId) ?? riskCells[24], [selectedId]);
  const recommendations = riskCells.filter((cell) => cell.classification === "Preferred").sort((a, b) => a.risk - b.risk || a.circlePressure - b.circlePressure).slice(0, 3);
  const dangerCount = riskCells.filter((cell) => cell.classification === "Avoid").length;

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file", { description: "PNG, JPG, or another browser-readable image is required." });
      return;
    }
    setUploadedImage(URL.createObjectURL(file));
    setUploadedName(file.name);
    setLayer("raw");
    toast.message("Terrain plate staged", { description: "Run the Python detector to turn a raw upload into a scored landing map." });
  };

  const resetSample = () => {
    setUploadedImage(null);
    setUploadedName("");
    setLayer("risk");
    setSelectedId("E5");
    toast.success("Verified landing map restored");
  };

  const downloadDecision = () => {
    const rows = [
      "recommended_zone,risk_score,classification,edge_density,circle_pressure,reason",
      `${selected.id},${selected.risk},${selected.classification},${selected.edgeDensity},${selected.circlePressure},"${classifyReason(selected)}"`,
      "scoring_method,,,,''," + "0.32 × normalized edge density + 0.68 × normalized circle pressure",
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `terrain-signal-${selected.id}-landing-decision.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Decision brief for ${selected.id} downloaded`);
  };

  const displayedImage = uploadedImage ?? (layer === "hazards" ? assets.sampleAnnotated : assets.sampleOriginal);
  const layerLabel = uploadedImage ? "Raw staging plate" : layer === "risk" ? "Risk map" : layer === "hazards" ? "Hazard detections" : "Raw terrain";

  return (
    <main className="min-h-screen overflow-hidden bg-[#EFE8DB] text-[#27221E]">
      <div className="fixed inset-0 -z-10 opacity-[0.42]" style={{ backgroundImage: `url(${assets.texture})`, backgroundSize: "520px 346px" }} />
      <input ref={uploadRef} onChange={handleUpload} accept="image/*" type="file" className="hidden" />

      <header className="border-b border-[#D4C7B5]/85 bg-[#EFE8DB]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <a href="#top" className="group flex items-center gap-3" aria-label="Terrain Signal home">
            <img src={assets.mark} alt="Terrain Signal symbol" className="h-10 w-10 object-contain transition-transform duration-200 group-hover:-rotate-6" />
            <div className="leading-none"><p className="font-display text-[17px] font-semibold tracking-[-0.06em]">TERRAIN / SIGNAL</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[#796C60]">Landing zone desk</p></div>
          </a>
          <nav className="hidden items-center gap-7 font-mono text-[11px] uppercase tracking-[0.13em] text-[#5F554C] md:flex"><a className="transition-colors hover:text-[#C84A2C]" href="#mission">Mission map</a><a className="transition-colors hover:text-[#C84A2C]" href="#decision">Decision</a><a className="transition-colors hover:text-[#C84A2C]" href="#method">Method</a></nav>
          <Button onClick={downloadDecision} className="h-10 rounded-full bg-[#27221E] px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#F7F1E7] hover:bg-[#C84A2C]">Decision brief <ArrowDownToLine className="ml-2 size-3.5" /></Button>
        </div>
      </header>

      <section id="top" className="relative mx-auto max-w-[1440px] px-5 pb-12 pt-10 sm:px-8 sm:pt-14 lg:px-12 lg:pb-16">
        <div className="grid items-end gap-10 lg:grid-cols-[1.06fr_.94fr]">
          <div className="relative z-10 max-w-3xl lg:pb-2">
            <div className="mb-7 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#9A3E28]"><span className="h-px w-10 bg-[#C84A2C]" /> Descent analysis · Curiosity sample 01</div>
            <h1 className="font-display max-w-3xl text-[clamp(3.25rem,7vw,7.15rem)] leading-[0.87] tracking-[-0.075em] text-[#27221E]">Find the safer<br /><em className="font-normal text-[#C84A2C]">way down.</em></h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#5F554C] sm:text-lg">Turn a rover-view terrain image into a landing decision. Hazard candidates become a visible risk grid, ranked zones, and a plain-language recommendation a mission team can inspect at a glance.</p>
            <div className="mt-9 flex flex-wrap gap-3"><Button onClick={() => document.querySelector("#mission")?.scrollIntoView({ behavior: "smooth" })} className="h-12 rounded-full bg-[#C84A2C] px-6 text-sm text-white hover:bg-[#A93B25]">Open mission map <ChevronRight className="ml-1 size-4" /></Button><Button variant="outline" onClick={() => uploadRef.current?.click()} className="h-12 rounded-full border-[#BFB1A0] bg-[#F7F1E7]/70 px-5 text-sm text-[#352F29] hover:bg-white"><Upload className="mr-2 size-4" /> Stage terrain image</Button></div>
          </div>
          <div className="relative min-h-[320px] overflow-hidden rounded-[2rem] border border-[#CFC0AD] shadow-[0_24px_70px_rgba(52,39,27,0.16)] sm:min-h-[390px]">
            <img src={assets.hero} alt="Curiosity-style view across a Martian rock field" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-tr from-[#2E241C]/70 via-transparent to-[#F5E2C5]/20" />
            <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/25 bg-black/25 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#FBEFE0] backdrop-blur-sm"><MapPinned className="size-3" /> Entry corridor review</div>
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between border-t border-white/30 pt-3 text-white"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">Mission question</p><p className="mt-1 font-display text-xl tracking-[-0.04em]">Which cell earns the cleanest approach?</p></div><Crosshair className="mb-1 size-6 text-[#EAC59E]" /></div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#D4C7B5] bg-[#F7F1E7]/72"><div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12"><div className="grid gap-5 md:grid-cols-4"><Metric label="Primary zone" value="E5" note="risk score 2 / 10" /><Metric label="Detected circles" value="22" note="Hough candidates" /><Metric label="High-risk cells" value={`${dangerCount}`} note="avoid / review" /><Metric label="Map resolution" value="5 × 5" note="100 px per cell" /></div></div></section>

      <section id="mission" className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#9A3E28]"><span className="h-2 w-2 rounded-full bg-[#C84A2C]" /> Mission map</div><h2 className="mt-3 font-display text-4xl tracking-[-0.06em] sm:text-5xl">Terrain, translated to choice.</h2></div><p className="max-w-md text-sm leading-6 text-[#665B51]">The 5 × 5 grid is calculated from the verified Canny edge image and Hough-circle coordinates. Select a square to review its score and evidence.</p></div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_355px]">
          <article className="relative overflow-hidden rounded-[2rem] border border-[#CFC0AD] bg-[#29241F] p-3 shadow-[0_20px_55px_rgba(49,34,21,0.15)] sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1 text-[#F6EDE1]"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-white/10"><Grid3X3 className="size-4" /></span><div><p className="font-mono text-[10px] uppercase tracking-[0.17em] text-white/55">Landing map</p><p className="mt-0.5 text-sm font-medium">{uploadedImage ? uploadedName : "curiosity_image_01.png"}</p></div></div><span className="rounded-full border border-[#A6D999]/40 bg-[#A6D999]/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#B7E5AC]">{layerLabel}</span></div>
            <div className="relative aspect-square overflow-hidden rounded-[1.4rem] bg-black">
              <img src={displayedImage} alt={uploadedImage ? "User staged Mars terrain image" : "Curiosity Mars terrain used for the landing-zone risk map"} className="absolute inset-0 h-full w-full object-cover" />
              {!uploadedImage && <RiskGrid selected={selectedId} setSelected={setSelectedId} visible={gridVisible && layer === "risk"} />}
              {!uploadedImage && layer === "risk" && <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/65 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/80"><span className="size-2 rounded-full bg-[#79B565]" /> low score <span className="ml-1 size-2 rounded-full bg-[#D75E3B]" /> high score</div>}
              {uploadedImage && <div className="absolute inset-x-4 bottom-4 border border-white/15 bg-black/65 p-4 text-white backdrop-blur-sm"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#EAC59E]">Raw staging plate</p><p className="mt-1 text-sm leading-5 text-white/85">This image is ready for the Python detector. Its risk grid will become available after hazards and scores are generated.</p></div>}
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-1"><div className="flex rounded-full border border-white/15 p-1"><button onClick={() => setLayer("raw")} className={`rounded-full px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.13em] transition-colors ${layer === "raw" ? "bg-white text-[#29241F]" : "text-white/55 hover:text-white"}`}>Raw</button><button disabled={!!uploadedImage} onClick={() => setLayer("hazards")} className={`rounded-full px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.13em] transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${layer === "hazards" ? "bg-[#C84A2C] text-white" : "text-white/55 hover:text-white"}`}>Hazards</button><button disabled={!!uploadedImage} onClick={() => setLayer("risk")} className={`rounded-full px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.13em] transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${layer === "risk" ? "bg-[#5E9A53] text-white" : "text-white/55 hover:text-white"}`}>Risk</button></div><button onClick={() => setGridVisible((value) => !value)} disabled={!!uploadedImage} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.13em] text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"><Layers3 className="size-3.5" /> {gridVisible ? "Hide grid" : "Show grid"}</button></div>
          </article>

          <aside id="decision" className="flex flex-col rounded-[2rem] border border-[#CFC0AD] bg-[#F7F1E7] p-6 shadow-[0_14px_36px_rgba(58,43,28,0.08)]">
            <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#9A3E28]">Decision panel</p><h3 className="mt-2 font-display text-3xl tracking-[-0.055em]">Zone {selected.id}</h3></div><ShieldCheck className="mt-1 size-6 text-[#5E9A53]" /></div>
            <div className="mt-5 rounded-[1.25rem] border border-[#BFD3B5] bg-[#E7F0E0] p-5"><div className="flex items-end justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4E7545]">{selected.classification} approach</p><p className="mt-1 font-display text-4xl tracking-[-0.07em] text-[#274522]">{selected.risk}<span className="ml-1 font-mono text-sm tracking-normal">/ 10</span></p></div><div className="grid size-12 place-items-center rounded-full border border-[#93B986] bg-[#5E9A53] text-[#F2F8EC]"><MapPinned className="size-5" /></div></div><p className="mt-4 text-sm leading-6 text-[#466140]">{classifyReason(selected)}</p></div>
            <div className="mt-6 space-y-3 border-t border-[#D8CCBA] pt-5"><div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.13em] text-[#62574D]"><span>Edge density</span><span>{(selected.edgeDensity * 100).toFixed(2)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#E4D9CA]"><div className="h-full rounded-full bg-[#C84A2C]" style={{ width: `${Math.min(100, selected.edgeDensity * 500)}%` }} /></div><div className="mt-5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.13em] text-[#62574D]"><span>Circle pressure</span><span>{selected.circlePressure.toFixed(2)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#E4D9CA]"><div className="h-full rounded-full bg-[#5E9A53]" style={{ width: `${Math.min(100, selected.circlePressure * 20)}%` }} /></div></div>
            <div className="mt-7 border-t border-[#D8CCBA] pt-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7C6D61]">Best alternatives</p><div className="mt-3 space-y-2">{recommendations.map((zone, index) => <button onClick={() => setSelectedId(zone.id)} key={zone.id} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${zone.id === selected.id ? "bg-[#E8DED0]" : "hover:bg-[#EEE5D8]"}`}><span className="flex items-center gap-3"><span className="font-mono text-xs text-[#8A796B]">0{index + 1}</span><span className="font-display text-lg">{zone.id}</span></span><span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#547C4A]">{zone.risk} / 10</span></button>)}</div></div>
            <div className="mt-auto pt-7"><Button onClick={downloadDecision} className="h-11 w-full rounded-full bg-[#27221E] text-sm text-white hover:bg-[#C84A2C]"><ArrowDownToLine className="mr-2 size-4" /> Export decision brief</Button>{uploadedImage && <button onClick={resetSample} className="mt-3 w-full text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#9A3E28] hover:underline">Return to verified sample</button>}</div>
          </aside>
        </div>
      </section>

      <section className="border-y border-[#D4C7B5] bg-[#DDD1BE]/55"><div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[.88fr_1.12fr] lg:px-12 lg:py-20"><div className="relative min-h-[330px] overflow-hidden rounded-[1.6rem] border border-[#BDAE9C] bg-[#49372C]"><img src={assets.fieldPlate} alt="Detailed Mars field plate of rocks and dusty soil" className="absolute inset-0 h-full w-full object-cover opacity-85 mix-blend-luminosity" /><div className="absolute inset-0 bg-gradient-to-tr from-[#241A15] via-[#513A2A]/20 to-transparent" /><div className="absolute inset-x-6 bottom-6 text-[#F7F1E7]"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#EAC59E]">Decision logic</p><p className="mt-3 max-w-md font-display text-3xl leading-[0.95] tracking-[-0.06em]">Hazards become a reasoned recommendation.</p></div></div><div className="self-center"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9A3E28]">Risk scoring, made inspectable</p><h2 className="mt-3 font-display text-4xl leading-none tracking-[-0.06em] sm:text-5xl">One grid, three evidence layers.</h2><div className="mt-9 grid gap-5 sm:grid-cols-3"><div className="border-t-2 border-[#C84A2C] pt-4"><div className="flex items-center gap-2"><ScanLine className="size-4 text-[#C84A2C]" /><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#7B4030]">01 · Edges</p></div><p className="mt-3 text-sm leading-6 text-[#5D5147]">Each cell measures dense brightness transitions as a proxy for rocky, broken terrain.</p></div><div className="border-t-2 border-[#5E9A53] pt-4"><div className="flex items-center gap-2"><CircleDotDashed className="size-4 text-[#5E9A53]" /><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#456B3C]">02 · Circles</p></div><p className="mt-3 text-sm leading-6 text-[#5D5147]">Larger nearby circular candidates create more pressure on a zone and its neighbors.</p></div><div className="border-t-2 border-[#B78132] pt-4"><div className="flex items-center gap-2"><FlaskConical className="size-4 text-[#B78132]" /><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#715225]">03 · Rank</p></div><p className="mt-3 text-sm leading-6 text-[#5D5147]">The combined values rank squares from safest to riskiest for a clear next inspection.</p></div></div></div></div></section>

      <section id="method" className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24"><div className="grid gap-10 lg:grid-cols-[1fr_.82fr] lg:items-end"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9A3E28]">Method ledger</p><h2 className="mt-3 max-w-3xl font-display text-5xl leading-[0.94] tracking-[-0.065em] sm:text-6xl">Trust the image, then challenge the score.</h2></div><div className="rounded-[1.6rem] border border-[#CFC0AD] bg-[#F7F1E7]/80 p-6"><Info className="size-5 text-[#C84A2C]" /><p className="mt-4 text-sm leading-6 text-[#5C5148]">A low score is a recommendation, not a guarantee. The map is designed to focus human review on the clearest candidate zones and make uncertainty visible.</p></div></div><div className="mt-10 grid gap-5 md:grid-cols-3"><article className="border border-[#D5C9B8] bg-[#F7F1E7]/65 p-6"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9A3E28]">Verified source</p><h3 className="mt-4 font-display text-2xl tracking-[-0.05em]">Curiosity image 01.</h3><p className="mt-3 text-sm leading-6 text-[#665A50]">This dashboard uses the existing 500 × 500 sample, its real Canny edge output, and its saved Hough candidate circles.</p></article><article className="border border-[#D5C9B8] bg-[#F7F1E7]/65 p-6"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9A3E28]">Scoring weight</p><h3 className="mt-4 font-display text-2xl tracking-[-0.05em]">68% circle, 32% edge.</h3><p className="mt-3 text-sm leading-6 text-[#665A50]">The saved grid emphasizes circular-feature pressure while retaining terrain complexity as a secondary risk signal.</p></article><article className="border border-[#D5C9B8] bg-[#F7F1E7]/65 p-6"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9A3E28]">Operator note</p><h3 className="mt-4 font-display text-2xl tracking-[-0.05em]">Review first, claim later.</h3><p className="mt-3 text-sm leading-6 text-[#665A50]">Candidate circles may include rock outlines, shadow transitions, or imaging artifacts. Mission context still matters.</p></article></div>
        <div className="mt-10 flex flex-col gap-5 rounded-[1.8rem] border border-[#D1C3B1] bg-[#29241F] p-6 text-[#F7F1E7] sm:flex-row sm:items-center sm:justify-between sm:p-8"><div className="flex items-start gap-4"><TriangleAlert className="mt-1 size-5 shrink-0 text-[#EAC59E]" /><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#EAC59E]">A note on certainty</p><p className="mt-2 max-w-3xl text-sm leading-6 text-white/75">This is a decision-support prototype. It visualizes computer-vision signals and a transparent scoring rule; it does not replace slope, soil strength, illumination, engineering constraints, or mission-team validation.</p></div></div><Button onClick={() => uploadRef.current?.click()} className="h-11 shrink-0 rounded-full bg-[#F7F1E7] text-[#2B2520] hover:bg-[#EAC59E]"><FileImage className="mr-2 size-4" /> Stage another image</Button></div>
      </section>

      <footer className="border-t border-[#CFC0AD] bg-[#29241F] text-[#F7F1E7]"><div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-12"><div className="flex max-w-lg items-start gap-4"><img src={assets.mark} alt="" className="mt-0.5 size-10 object-contain" /><div><p className="font-display text-2xl tracking-[-0.055em]">Terrain Signal</p><p className="mt-2 text-sm leading-6 text-white/60">A decision desk for turning raw Mars imagery into inspectable landing-zone evidence.</p></div></div><div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50">Curiosity sample · hazard detection · risk ranking</div></div></footer>
    </main>
  );
}
