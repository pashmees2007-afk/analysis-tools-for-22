/**
 * MARSBOUND design: an original aerospace mission-control narrative with cinematic
 * terrain evidence, explicit analysis states, and an explainable landing recommendation.
 */
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileImage,
  Grid3X3,
  Info,
  LoaderCircle,
  MapPin,
  Play,
  Radar,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { toast } from "sonner";

type Mode = "original" | "hazards" | "risk" | "zones";
type MissionStage =
  | "briefing"
  | "acquired"
  | "processing"
  | "results"
  | "awaiting-api";
type Classification = "Preferred" | "Conditional" | "Avoid";

type Zone = {
  id: string;
  row: number;
  col: number;
  risk: number;
  edgeDensity: number;
  circlePressure: number;
  classification: Classification;
};

type AnalysisResult = {
  filename: string;
  dimensions: string;
  imageState: "VERIFIED SAMPLE" | "STAGED UPLOAD";
  circleCandidates: number;
  edgePixels: number;
  highRiskAreas: number;
  safeZones: number;
  recommendedZone: string;
  riskScore: number;
  confidence: "HIGH";
  reason: string;
  zones: Zone[];
};

const assets = {
  hero: "/manus-storage/marsbound-hero-terrain_f65f8de3.jpg",
  tacticalTerrain: "/manus-storage/marsbound-tactical-terrain_22d57812.jpg",
  galleryDune: "/manus-storage/marsbound-gallery-dune_5c983278.jpg",
  darkGrid: "/manus-storage/marsbound-dark-grid_497d1120.jpg",
  mark: "/manus-storage/marsbound-mark_17b62cf7.png",
  original: "/manus-storage/curiosity_image_01_95938ea6.png",
  hazards: "/manus-storage/curiosity_image_01_annotated_71856f00.png",
  additionalSample: "/manus-storage/curiosity_image_10_c9177f10.png",
};

const zones: Zone[] = [
  ["A1", 0, 0, 4, 0.0372, 2.0353, "Conditional"],
  ["A2", 0, 1, 5, 0.0316, 2.6818, "Conditional"],
  ["A3", 0, 2, 5, 0.0206, 2.7229, "Conditional"],
  ["A4", 0, 3, 4, 0.0208, 2.1925, "Conditional"],
  ["A5", 0, 4, 3, 0.0277, 1.4768, "Preferred"],
  ["B1", 1, 0, 6, 0.0849, 3.0093, "Avoid"],
  ["B2", 1, 1, 9, 0.1206, 4.5182, "Avoid"],
  ["B3", 1, 2, 9, 0.1372, 4.644, "Avoid"],
  ["B4", 1, 3, 8, 0.126, 3.537, "Avoid"],
  ["B5", 1, 4, 5, 0.0797, 2.182, "Conditional"],
  ["C1", 2, 0, 6, 0.0757, 3.0356, "Avoid"],
  ["C2", 2, 1, 8, 0.051, 4.7446, "Avoid"],
  ["C3", 2, 2, 8, 0.0613, 4.6897, "Avoid"],
  ["C4", 2, 3, 7, 0.0679, 3.9577, "Avoid"],
  ["C5", 2, 4, 5, 0.074, 2.3928, "Conditional"],
  ["D1", 3, 0, 4, 0, 2.079, "Conditional"],
  ["D2", 3, 1, 4, 0, 2.8096, "Conditional"],
  ["D3", 3, 2, 5, 0.0048, 2.9307, "Conditional"],
  ["D4", 3, 3, 4, 0.0143, 2.5191, "Conditional"],
  ["D5", 3, 4, 3, 0.0048, 1.7252, "Preferred"],
  ["E1", 4, 0, 3, 0, 1.2433, "Preferred"],
  ["E2", 4, 1, 3, 0, 1.5639, "Preferred"],
  ["E3", 4, 2, 3, 0, 1.6362, "Preferred"],
  ["E4", 4, 3, 3, 0, 1.4378, "Preferred"],
  ["E5", 4, 4, 2, 0.0083, 1.0664, "Preferred"],
].map(([id, row, col, risk, edgeDensity, circlePressure, classification]) => ({
  id: id as string,
  row: row as number,
  col: col as number,
  risk: risk as number,
  edgeDensity: edgeDensity as number,
  circlePressure: circlePressure as number,
  classification: classification as Classification,
}));

const verifiedResult: AnalysisResult = {
  filename: "curiosity_image_01.png",
  dimensions: "500 × 500 PX",
  imageState: "VERIFIED SAMPLE",
  circleCandidates: 22,
  edgePixels: 10484,
  highRiskAreas: 8,
  safeZones: 7,
  recommendedZone: "E5",
  riskScore: 2,
  confidence: "HIGH",
  reason:
    "Lowest combined circular-feature pressure with sparse edge activity in the verified image pass.",
  zones,
};

const riskStyle: Record<
  Classification,
  { bg: string; text: string; ring: string; label: string }
> = {
  Preferred: {
    bg: "rgba(92, 137, 88, 0.48)",
    text: "#e7f7de",
    ring: "#b6dcaa",
    label: "SAFE",
  },
  Conditional: {
    bg: "rgba(177, 126, 43, 0.46)",
    text: "#fff1cc",
    ring: "#f6d895",
    label: "REVIEW",
  },
  Avoid: {
    bg: "rgba(184, 55, 39, 0.55)",
    text: "#ffe9e4",
    ring: "#f3a398",
    label: "HIGH",
  },
};

function zoneReason(zone: Zone) {
  if (zone.classification === "Preferred")
    return "Low candidate-circle pressure and an open edge profile provide the clearest available approach region.";
  if (zone.classification === "Conditional")
    return "Moderate detection pressure. A visual terrain review should precede any descent commitment.";
  return "Dense terrain edges and elevated circular-feature pressure create a higher-risk descent environment.";
}

function StatusLamp({
  label,
  active = true,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.13em] text-white/60">
      <span
        className={`size-1.5 rounded-full ${active ? "bg-[#68AB63] shadow-[0_0_10px_rgba(104,171,99,.8)]" : "bg-white/25"}`}
      />
      {label}
    </span>
  );
}

function RiskGrid({
  selected,
  onSelect,
  visible,
}: {
  selected: string;
  onSelect: (zone: string) => void;
  visible: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 grid grid-cols-5 grid-rows-5 transition-opacity duration-300 ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      {zones.map(zone => {
        const style = riskStyle[zone.classification];
        const chosen = zone.id === selected;
        return (
          <button
            key={zone.id}
            onClick={() => onSelect(zone.id)}
            aria-label={`${zone.id}, risk ${zone.risk} out of 10`}
            className="relative flex min-h-0 flex-col justify-between border border-white/30 p-1 text-left transition-all duration-150 hover:brightness-125 sm:p-2"
            style={{
              background: style.bg,
              color: style.text,
              boxShadow: chosen
                ? `inset 0 0 0 2px ${style.ring}, inset 0 0 24px rgba(0,0,0,.28)`
                : undefined,
            }}
          >
            <span className="font-mono text-[8px] uppercase tracking-[0.08em] sm:text-[10px]">
              {zone.id}
            </span>
            <span className="self-end font-mono text-base font-medium tracking-[-0.08em] sm:text-xl">
              {zone.risk}
            </span>
            {zone.id === "E5" && (
              <span className="absolute bottom-1 left-1 rounded-sm bg-[#122114]/85 px-1 py-0.5 font-mono text-[6px] uppercase tracking-[0.09em] text-[#dff1d8] sm:text-[7px]">
                primary
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function Home() {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<MissionStage>("briefing");
  const [progress, setProgress] = useState(0);
  const [completeSteps, setCompleteSteps] = useState(0);
  const [mode, setMode] = useState<Mode>("original");
  const [selectedZoneId, setSelectedZoneId] = useState("E5");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState("");
  const [showExplainability, setShowExplainability] = useState(false);

  const result = verifiedResult;
  const selectedZone = useMemo(
    () =>
      result.zones.find(zone => zone.id === selectedZoneId) ?? result.zones[24],
    [selectedZoneId]
  );
  const topZones = useMemo(
    () =>
      result.zones
        .filter(zone => zone.classification === "Preferred")
        .sort((a, b) => a.risk - b.risk || a.circlePressure - b.circlePressure)
        .slice(0, 3),
    []
  );
  const currentImage =
    uploadedImage ?? (mode === "hazards" ? assets.hazards : assets.original);

  const scrollTo = (id: string) =>
    document
      .querySelector(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  const startAnalysis = (forceDemo?: unknown) => {
    const isDemo = forceDemo === true;
    if (uploadedImage && !isDemo) {
      setStage("processing");
      setProgress(0);
      setCompleteSteps(0);
      [18, 39, 62, 78].forEach((value, index) =>
        window.setTimeout(
          () => {
            setProgress(value);
            setCompleteSteps(index + 1);
          },
          (index + 1) * 360
        )
      );
      window.setTimeout(() => {
        setProgress(100);
        setCompleteSteps(4);
        setStage("awaiting-api");
      }, 1840);
      return;
    }
    setStage("processing");
    setProgress(0);
    setCompleteSteps(0);
    [16, 34, 56, 77, 92, 100].forEach((value, index) =>
      window.setTimeout(
        () => {
          setProgress(value);
          setCompleteSteps(index + 1);
          if (index === 5) {
            setStage("results");
            setMode("risk");
            toast.success("Landing assessment ready", {
              description:
                "Zone E5 is the recommended site in the verified sample.",
            });
            window.setTimeout(() => scrollTo("#results"), 180);
          }
        },
        (index + 1) * 390
      )
    );
  };

  const runDemo = () => {
    setUploadedImage(null);
    setUploadedName("");
    setSelectedZoneId("E5");
    scrollTo("#analysis");
    window.setTimeout(() => startAnalysis(true), 320);
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Image file required", {
        description:
          "Choose a JPG, PNG, WEBP, or another browser-readable image.",
      });
      return;
    }
    setUploadedImage(URL.createObjectURL(file));
    setUploadedName(file.name);
    setStage("acquired");
    setProgress(0);
    setCompleteSteps(0);
    setMode("original");
    toast.success("Terrain image acquired", {
      description:
        "Your plate is staged. Run the mission sequence to prepare it for a future OpenCV API pass.",
    });
    window.setTimeout(() => scrollTo("#analysis"), 140);
  };

  const resetMission = () => {
    setStage("briefing");
    setProgress(0);
    setCompleteSteps(0);
    setUploadedImage(null);
    setUploadedName("");
    setMode("original");
    setSelectedZoneId("E5");
    setShowExplainability(false);
    scrollTo("#analysis");
  };

  const exportReport = () => {
    const report = {
      mission: "MARSBOUND-01",
      target: "MARS",
      source_image: result.filename,
      image_state: result.imageState,
      detection: {
        circular_feature_candidates: result.circleCandidates,
        canny_edge_pixels: result.edgePixels,
      },
      recommended_zone: selectedZone.id,
      risk_score: `${selectedZone.risk}/10`,
      confidence: "HIGH",
      reason: zoneReason(selectedZone),
      scoring_method:
        "0.32 × normalized edge density + 0.68 × normalized circular-feature pressure",
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `marsbound-${selectedZone.id}-mission-report.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Mission report exported");
  };

  const workflow = [
    "IMAGE ACQUIRED",
    "TERRAIN NORMALIZED",
    "CIRCULAR FEATURE DETECTION",
    "ROCK EDGE DETECTION",
    "RISK FIELD GENERATION",
    "LANDING ZONE RANKING",
  ];

  return (
    <main className="min-h-screen bg-[#050505] text-[#F3F0E9] selection:bg-[#E13C2E] selection:text-white">
      <input
        ref={uploadRef}
        onChange={handleUpload}
        accept="image/*"
        type="file"
        className="hidden"
      />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050505]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1540px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <a
            href="#top"
            className="flex items-center gap-3"
            aria-label="MARSBOUND home"
          >
            <img
              src={assets.mark}
              alt="MARSBOUND landing-reticle mark"
              className="size-11 object-contain"
            />
            <div>
              <p className="font-tech text-sm font-medium tracking-[0.16em] text-white">
                MARSBOUND
              </p>
              <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-white/45">
                Landing Site Intelligence
              </p>
            </div>
          </a>
          <nav className="hidden items-center gap-7 font-mono text-[10px] uppercase tracking-[0.15em] text-white/60 md:flex">
            <a href="#mission" className="hover:text-white">
              Mission
            </a>
            <a href="#analysis" className="hover:text-white">
              Analyze
            </a>
            <a href="#how" className="hover:text-white">
              How it works
            </a>
            <a href="#results" className="hover:text-white">
              Results
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block">
              <StatusLamp label="Mission status: online" />
            </span>
            <Button
              onClick={runDemo}
              className="mission-cta relative h-9 overflow-hidden rounded-none border border-[#E13C2E] bg-[#E13C2E] px-3 font-mono text-[9px] uppercase tracking-[0.13em] text-white hover:bg-[#f14b3d]"
            >
              Run demo <Play className="ml-2 size-3 fill-current" />
            </Button>
          </div>
        </div>
      </header>

      <section
        id="top"
        className="relative isolate min-h-[calc(100vh-72px)] overflow-hidden border-b border-white/10"
      >
        <img
          src={assets.hero}
          alt="Cinematic Martian valley for a landing-site briefing"
          className="mars-hero absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,5,5,.96)_0%,rgba(5,5,5,.78)_35%,rgba(5,5,5,.25)_72%,rgba(5,5,5,.68)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,rgba(5,5,5,.9)_0%,transparent_32%)]" />
        <div className="absolute left-[8%] top-[14%] h-[1px] w-[170px] bg-[#E13C2E]" />
        <div className="pointer-events-none absolute right-[7%] top-[14%] hidden w-[310px] opacity-80 lg:block">
          <DescentSignal />
        </div>
        <div className="absolute bottom-10 right-6 hidden items-end gap-3 font-mono text-[9px] uppercase tracking-[0.17em] text-white/50 lg:flex">
          <span className="size-2 rounded-full border border-white/40" />
          <span>Target lock / Mars</span>
          <span className="h-px w-20 bg-white/25" />
        </div>
        <div className="relative mx-auto flex min-h-[calc(100vh-72px)] max-w-[1540px] items-center px-5 py-20 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <p className="hero-reveal font-mono text-[10px] uppercase tracking-[0.22em] text-[#FF887D]">
              MARSBOUND // LANDING SITE INTELLIGENCE
            </p>
            <h1 className="hero-reveal delay-1 mt-6 max-w-3xl font-tech text-[clamp(3.7rem,8.4vw,8.7rem)] font-medium leading-[0.88] tracking-[-0.07em] text-white">
              Find the safest ground before touchdown.
            </h1>
            <p className="hero-reveal delay-2 mt-7 max-w-xl text-base leading-7 text-white/70 sm:text-lg">
              Computer vision and terrain-risk analysis for autonomous Martian
              landing-site selection. See the evidence. Rank the ground. Commit
              with clarity.
            </p>
            <div className="hero-reveal delay-3 mt-10 flex flex-wrap gap-3">
              <Button
                onClick={() => scrollTo("#analysis")}
                className="mission-cta relative h-12 overflow-hidden rounded-none bg-[#E13C2E] px-5 font-mono text-[10px] uppercase tracking-[0.14em] hover:bg-[#F14B3D]"
              >
                Begin mission analysis <ArrowRight className="ml-3 size-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => scrollTo("#how")}
                className="h-12 rounded-none border-white/35 bg-black/20 px-5 font-mono text-[10px] uppercase tracking-[0.14em] text-white hover:bg-white hover:text-black"
              >
                View how it works
              </Button>
            </div>
          </div>
          <div className="absolute right-5 top-[62%] hidden w-[280px] border border-white/20 bg-black/55 p-4 backdrop-blur-sm lg:block">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[#FF887D]">
                Demo recommendation
              </span>
              <span className="size-1.5 rounded-full bg-[#68AB63] shadow-[0_0_9px_rgba(104,171,99,.9)]" />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="font-tech text-3xl tracking-[-0.06em] text-white">
                  ZONE E5
                </p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#B6DDB0]">
                  Risk 02 / 10 · recommended
                </p>
              </div>
              <div className="size-12">
                <DescentSignal compact />
              </div>
            </div>
          </div>
          <div className="absolute bottom-7 left-5 flex items-end gap-10 sm:left-8 lg:left-12">
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/65">
              <p className="text-white/35">Mission</p>
              <p className="mt-1 text-base text-white">MB-01</p>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/65">
              <p className="text-white/35">Target</p>
              <p className="mt-1 text-base text-white">Mars</p>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/65">
              <p className="text-white/35">System</p>
              <p className="mt-1 text-base text-white">Safety</p>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/65">
              <p className="text-white/35">Status</p>
              <p className="mt-1 flex items-center gap-2 text-base text-[#9CD194]">
                <span className="size-1.5 rounded-full bg-[#68AB63]" />
                Ready
              </p>
            </div>
          </div>
          <button
            onClick={() => scrollTo("#mission")}
            aria-label="Scroll to mission analysis"
            className="absolute bottom-7 right-5 flex flex-col items-center gap-2 font-mono text-[8px] uppercase tracking-[0.16em] text-white/50 sm:right-8 lg:right-12"
          >
            <span>Scroll</span>
            <ChevronDown className="mars-scroll size-4" />
          </button>
        </div>
      </section>

      <section
        id="mission"
        className="border-b border-white/10 bg-[#090909] py-5"
      >
        <div className="mx-auto grid max-w-[1540px] gap-4 px-5 sm:grid-cols-4 sm:px-8 lg:px-12">
          <StatusLamp label="Mission // Marsbound-01" />
          <StatusLamp label="Terrain model // OpenCV" />
          <StatusLamp label="Risk engine // Active" />
          <StatusLamp label="Data path // Local sample" />
        </div>
      </section>

      <section
        id="analysis"
        className="relative overflow-hidden bg-[#080808] py-20 sm:py-28"
      >
        <div
          className="absolute inset-0 opacity-[.16]"
          style={{
            backgroundImage: `url(${assets.darkGrid})`,
            backgroundSize: "cover",
          }}
        />
        <div className="relative mx-auto max-w-[1540px] px-5 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F17064]">
              01 // Mission analysis
            </p>
            <h2 className="mt-4 font-tech text-5xl tracking-[-0.06em] text-white sm:text-6xl">
              Acquire terrain. Begin assessment.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/60">
              Upload a terrain plate for a future API-backed OpenCV pass, or
              load the verified Curiosity test plate to experience the complete
              hazard, risk, and recommendation workflow now.
            </p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(340px,.8fr)]">
            <div className="relative overflow-hidden border border-white/15 bg-[#0C0C0C] p-5 sm:p-7">
              <div className="absolute right-0 top-0 h-14 w-14 border-b border-l border-white/10" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                    Image acquisition bay
                  </p>
                  <h3 className="mt-2 font-tech text-3xl tracking-[-0.04em] text-white">
                    {uploadedImage
                      ? "Terrain plate staged"
                      : "Load a terrain image"}
                  </h3>
                </div>
                <Upload className="size-5 text-[#E13C2E]" />
              </div>
              <div
                className={`mt-7 grid min-h-[270px] place-items-center border border-dashed ${uploadedImage ? "border-[#68AB63]/60 bg-[#111]" : "border-white/25 bg-[linear-gradient(135deg,rgba(255,255,255,.025)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.025)_50%,rgba(255,255,255,.025)_75%,transparent_75%)] bg-[length:16px_16px]"}`}
              >
                {uploadedImage ? (
                  <div className="relative h-full w-full min-h-[270px] overflow-hidden">
                    <img
                      src={uploadedImage}
                      alt="Uploaded terrain preview"
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/75 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.13em] text-white/75">
                      <span>{uploadedName}</span>
                      <span className="text-[#9CD194]">Acquired</span>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 text-center">
                    <FileImage className="mx-auto size-9 text-white/50" />
                    <p className="mt-5 font-mono text-sm uppercase tracking-[0.15em] text-white">
                      Drop terrain image
                    </p>
                    <p className="mt-3 text-sm text-white/50">
                      or select a file from system
                    </p>
                    <p className="mt-7 font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
                      JPG / PNG / WEBP · MAX SIZE 25 MB
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  onClick={() => uploadRef.current?.click()}
                  variant="outline"
                  className="h-11 rounded-none border-white/25 bg-transparent px-4 font-mono text-[10px] uppercase tracking-[0.13em] text-white hover:bg-white hover:text-black"
                >
                  <Upload className="mr-2 size-4" /> Select image
                </Button>
                <Button
                  onClick={runDemo}
                  className="mission-cta relative h-11 overflow-hidden rounded-none bg-white px-4 font-mono text-[10px] uppercase tracking-[0.13em] text-black hover:bg-[#E13C2E] hover:text-white"
                >
                  <Play className="mr-2 size-3.5 fill-current" /> Load sample
                  Mars image
                </Button>
              </div>
            </div>
            <div className="border border-white/15 bg-[#0C0C0C] p-5 sm:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                    System queue
                  </p>
                  <h3 className="mt-2 font-tech text-3xl tracking-[-0.04em] text-white">
                    Mission control
                  </h3>
                </div>
                <Activity className="size-5 text-[#E13C2E]" />
              </div>
              <div className="mt-7 space-y-3 border-t border-white/10 pt-5">
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.13em] text-white/50">
                  <span>Input</span>
                  <span
                    className={
                      uploadedImage || stage === "results"
                        ? "text-[#9CD194]"
                        : "text-white/30"
                    }
                  >
                    {uploadedImage
                      ? "staged upload"
                      : stage === "results"
                        ? "verified sample"
                        : "awaiting plate"}
                  </span>
                </div>
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.13em] text-white/50">
                  <span>Processing profile</span>
                  <span className="text-white/75">Canny + Hough</span>
                </div>
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.13em] text-white/50">
                  <span>Grid resolution</span>
                  <span className="text-white/75">5 × 5 zones</span>
                </div>
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.13em] text-white/50">
                  <span>Analysis status</span>
                  <span
                    className={
                      stage === "results"
                        ? "text-[#9CD194]"
                        : stage === "processing"
                          ? "text-[#F0C56B]"
                          : "text-white/75"
                    }
                  >
                    {stage === "results"
                      ? "complete"
                      : stage === "processing"
                        ? "running"
                        : stage === "awaiting-api"
                          ? "API required"
                          : "ready"}
                  </span>
                </div>
              </div>
              <Button
                onClick={startAnalysis}
                disabled={stage === "processing"}
                className="mt-8 h-12 w-full rounded-none bg-[#E13C2E] font-mono text-[10px] uppercase tracking-[0.14em] text-white hover:bg-[#F14B3D] disabled:opacity-50"
              >
                {stage === "processing" ? (
                  <>
                    <LoaderCircle className="mr-2 size-4 animate-spin" />{" "}
                    Analyzing terrain // {progress}%
                  </>
                ) : (
                  <>
                    <ScanLine className="mr-2 size-4" /> Run terrain analysis
                  </>
                )}
              </Button>
              <p className="mt-4 text-xs leading-5 text-white/40">
                The bundled sample returns a saved, verified OpenCV result.
                Uploaded images are staged for the API contract described in the
                mission flow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {(stage === "processing" || stage === "awaiting-api") && (
        <section className="border-y border-white/10 bg-[#0A0A0A] py-14">
          <div className="mx-auto max-w-[1540px] px-5 sm:px-8 lg:px-12">
            <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#F17064]">
                  Mission analysis
                </p>
                <h2 className="mt-3 font-tech text-4xl tracking-[-0.06em] text-white">
                  {stage === "awaiting-api"
                    ? "Terrain staged. Analysis endpoint required."
                    : "Reading the terrain..."}
                </h2>
                <p className="mt-4 text-sm leading-6 text-white/60">
                  {stage === "awaiting-api"
                    ? "The user-provided plate is preserved locally. Connect the OpenCV backend to return verified hazards, zones, and a recommendation for this specific image."
                    : "The verified demo runs a cinematic sequence over the saved OpenCV result."}
                </p>
              </div>
              <div className="border border-white/15 bg-[#0C0C0C] p-5 sm:p-7">
                <div className="mb-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-white/55">
                  <span>Analyzing terrain</span>
                  <span className="text-white">{progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden bg-white/10">
                  <div
                    className="h-full bg-[#E13C2E] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {workflow.map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 border-b border-white/10 py-2 font-mono text-[10px] uppercase tracking-[0.11em] text-white/55"
                    >
                      {index < completeSteps ? (
                        <Check className="size-3.5 text-[#8BC97D]" />
                      ) : index === completeSteps && stage === "processing" ? (
                        <LoaderCircle className="size-3.5 animate-spin text-[#F0C56B]" />
                      ) : (
                        <span className="size-3.5 rounded-full border border-white/25" />
                      )}
                      <span
                        className={index < completeSteps ? "text-white" : ""}
                      >
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {stage === "results" && (
        <section
          id="results"
          className="relative overflow-hidden bg-[#070707] py-20 sm:py-28"
        >
          <div
            className="absolute inset-0 opacity-[.12]"
            style={{
              backgroundImage: `url(${assets.darkGrid})`,
              backgroundSize: "cover",
            }}
          />
          <div className="relative mx-auto max-w-[1540px] px-5 sm:px-8 lg:px-12">
            <div className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F17064]">
                  02 // Terrain assessment complete
                </p>
                <h2 className="mt-4 font-tech text-5xl tracking-[-0.065em] text-white sm:text-6xl">
                  Landing evidence, resolved.
                </h2>
              </div>
              <div className="border-l border-[#E13C2E] pl-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/40">
                  Analysis state
                </p>
                <p className="mt-1 font-mono text-xs uppercase tracking-[0.13em] text-[#9CD194]">
                  Verified sample output // ready for review
                </p>
              </div>
            </div>
            <div className="grid gap-5 md:grid-cols-4">
              <Metric
                label="Circular feature candidates"
                value={`${result.circleCandidates}`}
                note="Hough circle detections"
              />
              <Metric
                label="Rock edge response"
                value={result.edgePixels.toLocaleString()}
                note="Canny edge pixels"
              />
              <Metric
                label="High-risk cells"
                value={`${result.highRiskAreas}`}
                note="risk score 6 and above"
              />
              <Metric
                label="Preferred zones"
                value={`${result.safeZones}`}
                note="risk score 3 and below"
              />
            </div>
            <RecommendationClimax
              zone={selectedZone}
              onInspect={() => setMode("zones")}
            />
            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <article className="border border-white/15 bg-[#0B0B0B] p-3 shadow-[0_25px_70px_rgba(0,0,0,.38)] sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center border border-white/15 bg-white/5">
                      <Radar className="size-4 text-[#F17064]" />
                    </span>
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">
                        Analysis viewport
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-white/80">
                        {result.filename} // {result.dimensions}
                      </p>
                    </div>
                  </div>
                  <span className="border border-[#8BC97D]/40 bg-[#8BC97D]/10 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#A9DB9D]">
                    OpenCV verified
                  </span>
                </div>
                <div className="relative aspect-square overflow-hidden border border-white/10 bg-black">
                  <img
                    src={currentImage}
                    alt="Mars terrain analysis result"
                    className={`absolute inset-0 h-full w-full object-cover ${mode === "zones" ? "opacity-45" : ""}`}
                  />
                  {mode === "risk" && (
                    <RiskGrid
                      selected={selectedZoneId}
                      onSelect={setSelectedZoneId}
                      visible
                    />
                  )}
                  {mode === "zones" && (
                    <>
                      <RiskGrid
                        selected={selectedZoneId}
                        onSelect={setSelectedZoneId}
                        visible
                      />
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute bottom-[2%] left-[80%] grid size-[18%] place-items-center border-2 border-[#D9F0D1] bg-[#68AB63]/25 text-center shadow-[0_0_30px_rgba(104,171,99,.55)]">
                          <div>
                            <MapPin className="mx-auto size-5 text-[#E7F7DE]" />
                            <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.12em] text-[#E7F7DE]">
                              E5
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(["original", "hazards", "risk", "zones"] as Mode[]).map(
                    item => (
                      <button
                        key={item}
                        onClick={() => setMode(item)}
                        className={`border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.13em] transition-colors ${mode === item ? "border-[#E13C2E] bg-[#E13C2E] text-white" : "border-white/15 text-white/55 hover:border-white/55 hover:text-white"}`}
                      >
                        {item === "original"
                          ? "Original"
                          : item === "hazards"
                            ? "Hazards"
                            : item === "risk"
                              ? "Risk map"
                              : "Landing zones"}
                      </button>
                    )
                  )}
                </div>
              </article>
              <aside className="flex flex-col border border-white/15 bg-[#0B0B0B] p-5 sm:p-7">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.17em] text-[#F17064]">
                      Primary recommendation
                    </p>
                    <h3 className="mt-3 font-tech text-4xl tracking-[-0.06em] text-white">
                      LANDING ZONE {selectedZone.id}
                    </h3>
                  </div>
                  <ShieldCheck className="size-6 text-[#9CD194]" />
                </div>
                <div className="mt-6 border border-[#7BB372]/50 bg-[#151F15] p-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-[#A6D69D]">
                        Risk score
                      </p>
                      <p className="mt-2 font-tech text-6xl leading-none tracking-[-0.09em] text-[#E8F6E3]">
                        {selectedZone.risk}
                        <span className="ml-2 font-mono text-base tracking-normal">
                          / 10
                        </span>
                      </p>
                    </div>
                    <span className="border border-[#8BC97D]/60 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#A9DB9D]">
                      Recommended
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#C5DBC0]">
                    {zoneReason(selectedZone)}
                  </p>
                </div>
                <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.13em] text-white/50">
                    <span>Hazard density</span>
                    <span className="text-[#9CD194]">LOW</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.13em] text-white/50">
                    <span>Circle proximity</span>
                    <span className="text-[#9CD194]">LOW</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.13em] text-white/50">
                    <span>Rock edge load</span>
                    <span className="text-[#9CD194]">SPARSE</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.13em] text-white/50">
                    <span>Clear area</span>
                    <span className="text-[#9CD194]">HIGH</span>
                  </div>
                </div>
                <Button
                  onClick={() => setShowExplainability(current => !current)}
                  variant="outline"
                  className="mt-7 h-11 w-full rounded-none border-white/20 bg-transparent font-mono text-[10px] uppercase tracking-[0.13em] text-white hover:bg-white hover:text-black"
                >
                  <Info className="mr-2 size-4" />{" "}
                  {showExplainability
                    ? "Hide rationale"
                    : `Why ${selectedZone.id}?`}
                </Button>
                {showExplainability && (
                  <div className="mt-4 border-l-2 border-[#E13C2E] bg-white/[.03] p-4 text-sm leading-6 text-white/65">
                    The ranking combines normalized edge density (32%) with
                    circular-feature pressure (68%). {selectedZone.id} has the
                    lowest resulting score of all 25 candidate cells in the
                    saved image pass.
                  </div>
                )}
              </aside>
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="border border-white/15 bg-[#0B0B0B] p-5 sm:p-7">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.17em] text-white/45">
                      Landing zone assessment
                    </p>
                    <h3 className="mt-2 font-tech text-3xl tracking-[-0.05em] text-white">
                      Ranked approach options
                    </h3>
                  </div>
                  <Grid3X3 className="size-5 text-[#F17064]" />
                </div>
                <div className="mt-6 divide-y divide-white/10">
                  {topZones.map((zone, index) => (
                    <button
                      onClick={() => {
                        setSelectedZoneId(zone.id);
                        setMode("zones");
                      }}
                      key={zone.id}
                      className={`grid w-full grid-cols-[34px_1fr_auto_auto] items-center gap-4 px-2 py-4 text-left transition-colors hover:bg-white/[.035] ${zone.id === selectedZone.id ? "bg-[#68AB63]/[.09]" : ""}`}
                    >
                      <span className="font-mono text-[10px] text-white/35">
                        0{index + 1}
                      </span>
                      <span className="font-tech text-2xl tracking-[-0.05em] text-white">
                        {zone.id}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.13em] text-white/55">
                        Risk {zone.risk}/10
                      </span>
                      <span className="border border-[#8BC97D]/50 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.13em] text-[#A9DB9D]">
                        {index === 0 ? "Recommended" : "Alternate"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="border border-white/15 bg-[#0B0B0B] p-5 sm:p-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.17em] text-[#F17064]">
                  Mission report
                </p>
                <div className="mt-5 grid grid-cols-2 gap-y-5 font-mono text-[10px] uppercase tracking-[0.12em]">
                  <div className="text-white/45">Mission</div>
                  <div className="text-right text-white">MARSBOUND-01</div>
                  <div className="text-white/45">Target</div>
                  <div className="text-right text-white">Mars</div>
                  <div className="text-white/45">Image</div>
                  <div className="text-right text-white">{result.filename}</div>
                  <div className="text-white/45">Detection</div>
                  <div className="text-right text-white">
                    {result.circleCandidates} circles
                  </div>
                  <div className="text-white/45">Zone</div>
                  <div className="text-right text-[#A9DB9D]">
                    {selectedZone.id}
                  </div>
                  <div className="text-white/45">Risk</div>
                  <div className="text-right text-[#A9DB9D]">
                    {selectedZone.risk}/10
                  </div>
                </div>
                <Button
                  onClick={exportReport}
                  className="mt-7 h-11 w-full rounded-none bg-white font-mono text-[10px] uppercase tracking-[0.13em] text-black hover:bg-[#E13C2E] hover:text-white"
                >
                  <ArrowDownToLine className="mr-2 size-4" /> Export analysis
                </Button>
                <button
                  onClick={resetMission}
                  className="mt-4 flex w-full items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/45 transition-colors hover:text-white"
                >
                  <RefreshCw className="size-3.5" /> New analysis
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section
        id="how"
        className="border-y border-white/10 bg-[#0A0A0A] py-20 sm:py-28"
      >
        <div className="mx-auto max-w-[1540px] px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F17064]">
              03 // How it works
            </p>
            <h2 className="mt-4 font-tech text-5xl tracking-[-0.065em] text-white sm:text-6xl">
              See. Score. Decide.
            </h2>
            <p className="mt-5 text-base leading-7 text-white/60">
              The system’s logic is kept visible: image evidence becomes
              hazards, hazards become risk, and risk becomes a shortlist a human
              can interrogate.
            </p>
          </div>
          <div className="descent-flow mt-12 grid gap-5 lg:grid-cols-3">
            <ProcessCard
              index="01"
              icon={<ScanLine className="size-5" />}
              title="SEE"
              subtitle="Computer vision detects terrain hazards."
              items={[
                "Terrain image",
                "Preprocessing",
                "Canny edge response",
                "Hough circular candidates",
              ]}
              accent="#E13C2E"
            />
            <ProcessCard
              index="02"
              icon={<Grid3X3 className="size-5" />}
              title="SCORE"
              subtitle="Risk logic converts hazards into a terrain score."
              items={[
                "5 × 5 candidate grid",
                "Hazard density",
                "Hazard distance",
                "Weighted risk score",
              ]}
              accent="#F0B24B"
            />
            <ProcessCard
              index="03"
              icon={<ShieldCheck className="size-5" />}
              title="DECIDE"
              subtitle="The safest zones are ranked automatically."
              items={[
                "25 possible zones",
                "Risk comparison",
                "Top 3 shortlist",
                "Recommended landing site",
              ]}
              accent="#8BC97D"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#050505] py-20 sm:py-28">
        <div className="mx-auto grid max-w-[1540px] gap-10 px-5 sm:px-8 lg:grid-cols-[.78fr_1.22fr] lg:px-12">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F17064]">
              04 // Technical architecture
            </p>
            <h2 className="mt-4 font-tech text-5xl tracking-[-0.065em] text-white">
              A short path from pixels to descent.
            </h2>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/60">
              The frontend is typed around an analysis result so an OpenCV
              service can later return verified hazards and risk zones through
              an API without changing the mission experience.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {[
                "Python",
                "OpenCV",
                "NumPy",
                "Computer Vision",
                "Image Processing",
                "Risk Scoring",
                "React",
              ].map(tag => (
                <span
                  key={tag}
                  className="border border-white/15 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white/55"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="relative border border-white/15 bg-[#0B0B0B] p-6 sm:p-9">
            <ArchitectureFlow />
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0A0A0A] py-20">
        <div className="mx-auto max-w-[1540px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#F17064]">
                05 // The terrain data
              </p>
              <h2 className="mt-4 font-tech text-5xl tracking-[-0.065em] text-white">
                Visual material for the mission.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-white/55">
              Sample imagery is clearly identified as demonstration material.
              The verified Curiosity test plate is the one currently connected
              to saved detector outputs.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <TerrainCard
              image={assets.original}
              label="Curiosity test plate"
              meta="USER-PROVIDED SAMPLE"
              state="VERIFIED ANALYSIS"
            />
            <TerrainCard
              image={assets.additionalSample}
              label="Curiosity terrain alternate"
              meta="USER-PROVIDED SAMPLE"
              state="AVAILABLE FOR PROCESSING"
            />
            <TerrainCard
              image={assets.galleryDune}
              label="Illustrative dune terrain"
              meta="MISSION VISUAL"
              state="ILLUSTRATIVE ONLY"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#050505] py-14">
        <div className="mx-auto flex max-w-[1540px] flex-col gap-6 px-5 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <div className="flex items-start gap-4">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#F0B24B]" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#F0C56B]">
                Mission safety note
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                MARSBOUND is a decision-support prototype. The visualized
                evidence and scoring rule support inspection; operational
                landing decisions also require slope, soil, illumination,
                engineering, and mission-validation inputs.
              </p>
            </div>
          </div>
          <Button
            onClick={runDemo}
            className="h-11 shrink-0 rounded-none bg-[#E13C2E] font-mono text-[10px] uppercase tracking-[0.13em] hover:bg-[#F14B3D]"
          >
            <Sparkles className="mr-2 size-4" /> Run demo analysis
          </Button>
        </div>
      </section>

      <footer className="bg-[#050505] py-10">
        <div className="mx-auto flex max-w-[1540px] flex-col gap-8 px-5 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-12">
          <div className="flex items-center gap-3">
            <img src={assets.mark} alt="" className="size-9" />
            <div>
              <p className="font-tech text-sm tracking-[0.16em] text-white">
                MARSBOUND
              </p>
              <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.16em] text-white/40">
                Landing Site Intelligence System
              </p>
            </div>
          </div>
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/35">
            MB-LSIS // Mission Control // Terrain Safety
          </div>
        </div>
      </footer>
    </main>
  );
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="border border-white/10 bg-white/[.025] p-5">
      <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/40">
        {label}
      </p>
      <p className="mt-2 font-tech text-3xl tracking-[-0.06em] text-white">
        {value}
      </p>
      <p className="mt-1 text-xs text-white/45">{note}</p>
    </div>
  );
}

function ProcessCard({
  index,
  icon,
  title,
  subtitle,
  items,
  accent,
}: {
  index: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  items: string[];
  accent: string;
}) {
  return (
    <article className="border border-white/15 bg-[#0D0D0D] p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <span
          className="grid size-10 place-items-center border"
          style={{ borderColor: `${accent}80`, color: accent }}
        >
          {icon}
        </span>
        <span className="font-mono text-[10px] text-white/35">{index}</span>
      </div>
      <h3 className="mt-8 font-tech text-3xl tracking-[-0.05em] text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-white/60">{subtitle}</p>
      <div className="mt-7 space-y-0">
        {items.map((item, index) => (
          <div
            key={item}
            className="flex items-center gap-3 border-t border-white/10 py-3 font-mono text-[9px] uppercase tracking-[0.13em] text-white/55"
          >
            <span
              className="size-1.5 rounded-full"
              style={{
                background:
                  index === items.length - 1 ? accent : "rgba(255,255,255,.3)",
              }}
            />
            {item}
          </div>
        ))}
      </div>
    </article>
  );
}

function ArchitectureFlow() {
  const nodes = [
    "Terrain image",
    "Image preprocessing",
    "Crater detection · Hough circles",
    "Rock detection · Canny edges",
    "Hazard map",
    "Risk engine",
    "Landing zone ranking",
    "Mission report",
  ];
  return (
    <div className="grid gap-0">
      {nodes.map((node, index) => (
        <div key={node} className="relative grid grid-cols-[30px_1fr] gap-4">
          <div className="flex flex-col items-center">
            <span
              className={`grid size-6 place-items-center rounded-full border ${index === nodes.length - 1 ? "border-[#8BC97D] bg-[#8BC97D]/10 text-[#A9DB9D]" : "border-white/25 text-white/45"}`}
            >
              {index === nodes.length - 1 ? (
                <ClipboardCheck className="size-3" />
              ) : (
                <span className="font-mono text-[8px]">
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
            </span>
            {index < nodes.length - 1 && (
              <span className="h-6 w-px bg-white/15" />
            )}
          </div>
          <div
            className={`mb-3 border p-3 font-mono text-[10px] uppercase tracking-[0.12em] ${index === nodes.length - 1 ? "border-[#8BC97D]/50 bg-[#8BC97D]/10 text-[#C8E8C1]" : "border-white/10 bg-white/[.025] text-white/65"}`}
          >
            {node}
          </div>
        </div>
      ))}
    </div>
  );
}

function TerrainCard({
  image,
  label,
  meta,
  state,
}: {
  image: string;
  label: string;
  meta: string;
  state: string;
}) {
  return (
    <article className="group overflow-hidden border border-white/15 bg-[#0C0C0C]">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={label}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <p className="absolute bottom-3 left-3 font-mono text-[8px] uppercase tracking-[0.13em] text-white/80">
          {label}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-y-3 p-4 font-mono text-[8px] uppercase tracking-[0.12em]">
        <span className="text-white/35">Source</span>
        <span className="text-right text-white/70">{meta}</span>
        <span className="text-white/35">Target</span>
        <span className="text-right text-white/70">Mars</span>
        <span className="text-white/35">Analysis</span>
        <span className="text-right text-[#A9DB9D]">{state}</span>
      </div>
    </article>
  );
}

function DescentSignal({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      viewBox="0 0 320 96"
      className={`descent-signal h-full w-full ${compact ? "" : ""}`}
      aria-hidden="true"
    >
      <path
        d="M10 72 C76 18 161 12 306 55"
        fill="none"
        stroke="#E13C2E"
        strokeWidth="2"
      />
      <path
        d="M10 79 C83 27 169 21 306 62"
        fill="none"
        stroke="rgba(255,255,255,.35)"
        strokeWidth="1"
        strokeDasharray="3 6"
      />
      <circle
        cx="226"
        cy="39"
        r="23"
        fill="rgba(5,5,5,.22)"
        stroke="#F3F0E9"
        strokeWidth="1.5"
      />
      <circle
        cx="226"
        cy="39"
        r="8"
        fill="none"
        stroke="#E13C2E"
        strokeWidth="2"
      />
      <path
        d="M226 7v15M226 56v15M194 39h15M243 39h15"
        stroke="#F3F0E9"
        strokeWidth="1"
        opacity=".65"
      />
      <path d="M222 35h8v8h-8z" fill="#E13C2E" />
    </svg>
  );
}

function RecommendationClimax({
  zone,
  onInspect,
}: {
  zone: Zone;
  onInspect: () => void;
}) {
  return (
    <section className="recommendation-climax relative mt-10 overflow-hidden border border-[#68AB63]/55 bg-[#0C130C] p-6 sm:p-9">
      <div className="relative grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#A9DB9D]">
            Mission decision // safest available ground
          </p>
          <h3 className="mt-3 font-tech text-4xl tracking-[-0.065em] text-white sm:text-5xl">
            LANDING ZONE {zone.id}
          </h3>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/65">
            {zoneReason(zone)}
          </p>
        </div>
        <div className="mx-auto size-36 sm:size-44">
          <DescentSignal />
        </div>
        <div className="lg:text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#A9DB9D]">
            Calculated terrain risk
          </p>
          <p className="mt-2 font-tech text-7xl leading-none tracking-[-0.09em] text-[#E7F7DE]">
            {zone.risk}
            <span className="ml-2 font-mono text-lg tracking-normal">/ 10</span>
          </p>
          <div className="mt-5 flex flex-wrap gap-3 lg:justify-end">
            <span className="border border-[#8BC97D]/60 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-[#A9DB9D]">
              Confidence high
            </span>
            <Button
              onClick={onInspect}
              variant="outline"
              className="h-9 rounded-none border-white/30 bg-transparent font-mono text-[9px] uppercase tracking-[0.13em] text-white hover:bg-white hover:text-black"
            >
              Inspect evidence <ArrowRight className="ml-2 size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
