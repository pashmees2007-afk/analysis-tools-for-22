/**
 * MARSBOUND evidence-first interface: terrain imagery, verified computer-vision
 * outputs, and matched AI4Mars semantic labels are the product.
 */
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  ArrowDownToLine,
  Check,
  ChevronRight,
  CircleDotDashed,
  FileImage,
  Info,
  LoaderCircle,
  MapPin,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { toast } from "sonner";

type Stage = "mission" | "processing" | "results" | "awaiting-api";
type View = "raw" | "hazards" | "risk" | "zones" | "prediction";
type LabelView = "source" | "overlay" | "mask";
type Zone = {
  id: string;
  row: number;
  col: number;
  risk: number;
  edgeDensity: number;
  circlePressure: number;
  classification: "PREFERRED" | "REVIEW" | "AVOID";
};

type BackendSegmentationResult = {
  analysisId: string;
  model: { version: string; label: string; trainingPairs: number };
  sourceUrl: string;
  predictionUrl: string;
  overlayUrl: string;
  width: number;
  height: number;
  classCounts: Array<{ classId: number; className: string; pixels: number; share: number }>;
  disclaimer: string;
};

const assets = {
  raw: "/manus-storage/curiosity_image_01_95938ea6.png",
  normalized: "/manus-storage/curiosity_image_01_normalized_1db0f368.png",
  edges: "/manus-storage/curiosity_image_01_rock_edges_1a44c93b.png",
  circles: "/manus-storage/curiosity_image_01_circle_candidates_59a3ddec.png",
  hazards: "/manus-storage/curiosity_image_01_annotated_71856f00.png",
  mark: "/manus-storage/marsbound-mark_17b62cf7.png",
  msl01Source: "/manus-storage/ai4mars_msl_01_source_37badad5.jpg",
  msl01Overlay: "/manus-storage/ai4mars_msl_01_overlay_0b129343.jpg",
  msl01Mask: "/manus-storage/ai4mars_msl_01_semantic_mask_797dac14.png",
  msl01RawMask: "/manus-storage/ai4mars_msl_01_raw_mask_c330fc6a.png",
  msl02Source: "/manus-storage/ai4mars_msl_02_source_655c88ac.jpg",
  msl02Overlay: "/manus-storage/ai4mars_msl_02_overlay_b2b98987.jpg",
  msl02Mask: "/manus-storage/ai4mars_msl_02_semantic_mask_0e2379ae.png",
  msl02RawMask: "/manus-storage/ai4mars_msl_02_raw_mask_e59547c0.png",
  msl03Source: "/manus-storage/ai4mars_msl_03_source_73f8e71e.jpg",
  msl03Overlay: "/manus-storage/ai4mars_msl_03_overlay_343d7402.jpg",
  msl03Mask: "/manus-storage/ai4mars_msl_03_semantic_mask_dc56edb1.png",
  msl03RawMask: "/manus-storage/ai4mars_msl_03_raw_mask_3566c096.png",
  prediction01: "/manus-storage/ai4mars_msl_01_prediction_mask_75f220e3.png",
  prediction01Overlay: "/manus-storage/ai4mars_msl_01_prediction_overlay_e95107b3.jpg",
  groundTruth01: "/manus-storage/ai4mars_msl_01_prediction_ground_truth_cff75e56.png",
  disagreement01: "/manus-storage/ai4mars_msl_01_prediction_disagreement_db2de359.png",
  prediction02: "/manus-storage/ai4mars_msl_02_prediction_mask_2f5e3092.png",
  prediction02Overlay: "/manus-storage/ai4mars_msl_02_prediction_overlay_28f3de6b.jpg",
  groundTruth02: "/manus-storage/ai4mars_msl_02_prediction_ground_truth_232f3c17.png",
  disagreement02: "/manus-storage/ai4mars_msl_02_prediction_disagreement_19b1c044.png",
  prediction03: "/manus-storage/ai4mars_msl_03_prediction_mask_f06dcc93.png",
  prediction03Overlay: "/manus-storage/ai4mars_msl_03_prediction_overlay_ba842624.jpg",
  groundTruth03: "/manus-storage/ai4mars_msl_03_prediction_ground_truth_b74d87e7.png",
  disagreement03: "/manus-storage/ai4mars_msl_03_prediction_disagreement_ba722388.png",
};

const modelComparisons = [
  { id: "MSL-01", source: assets.msl01Source, prediction: assets.prediction01, overlay: assets.prediction01Overlay, groundTruth: assets.groundTruth01, disagreement: assets.disagreement01, accuracy: "47.81%", macroF1: "22.95%", note: "Bedrock-dominant test plate" },
  { id: "MSL-02", source: assets.msl02Source, prediction: assets.prediction02, overlay: assets.prediction02Overlay, groundTruth: assets.groundTruth02, disagreement: assets.disagreement02, accuracy: "45.98%", macroF1: "21.98%", note: "Bedrock and big-rock test plate" },
  { id: "MSL-03", source: assets.msl03Source, prediction: assets.prediction03, overlay: assets.prediction03Overlay, groundTruth: assets.groundTruth03, disagreement: assets.disagreement03, accuracy: "4.19%", macroF1: "2.14%", note: "Failure case: soil and sand scene" },
];

const terrainClasses: Record<number, { name: string; color: string; detail: string }> = {
  0: { name: "Soil", color: "#B78554", detail: "Navigation terrain class" },
  1: { name: "Bedrock", color: "#688CB4", detail: "Navigation terrain class" },
  2: { name: "Sand", color: "#DDBA4D", detail: "Navigation terrain class" },
  3: { name: "Big rock", color: "#D95241", detail: "Navigation terrain class" },
  255: { name: "No label", color: "#525252", detail: "Outside confident annotated area" },
};

const labeledTerrainSamples = [
  {
    id: "MSL-01",
    imageId: "NLA_601599700EDR_F0731944NCAM00258M1",
    source: assets.msl01Source,
    overlay: assets.msl01Overlay,
    mask: assets.msl01Mask,
    rawMask: assets.msl01RawMask,
    coverage: "28.98%",
    classes: [0, 1, 2],
    counts: { 0: 51768, 1: 241692, 2: 10367, 3: 0, 255: 744749 },
  },
  {
    id: "MSL-02",
    imageId: "NLB_436560661EDR_F0220000NCAM00354M1",
    source: assets.msl02Source,
    overlay: assets.msl02Overlay,
    mask: assets.msl02Mask,
    rawMask: assets.msl02RawMask,
    coverage: "78.03%",
    classes: [1, 3],
    counts: { 0: 0, 1: 796917, 2: 0, 3: 21337, 255: 230322 },
  },
  {
    id: "MSL-03",
    imageId: "NLB_458661027EDR_F0390516NCAM00354M1",
    source: assets.msl03Source,
    overlay: assets.msl03Overlay,
    mask: assets.msl03Mask,
    rawMask: assets.msl03RawMask,
    coverage: "81.46%",
    classes: [0, 2],
    counts: { 0: 852740, 1: 0, 2: 1417, 3: 0, 255: 194419 },
  },
];

const zones: Zone[] = [
  ["A1", 0, 0, 4, 0.0372, 2.0353, "REVIEW"],
  ["A2", 0, 1, 5, 0.0316, 2.6818, "REVIEW"],
  ["A3", 0, 2, 5, 0.0206, 2.7229, "REVIEW"],
  ["A4", 0, 3, 4, 0.0208, 2.1925, "REVIEW"],
  ["A5", 0, 4, 3, 0.0277, 1.4768, "PREFERRED"],
  ["B1", 1, 0, 6, 0.0849, 3.0093, "AVOID"],
  ["B2", 1, 1, 9, 0.1206, 4.5182, "AVOID"],
  ["B3", 1, 2, 9, 0.1372, 4.644, "AVOID"],
  ["B4", 1, 3, 8, 0.126, 3.537, "AVOID"],
  ["B5", 1, 4, 5, 0.0797, 2.182, "REVIEW"],
  ["C1", 2, 0, 6, 0.0757, 3.0356, "AVOID"],
  ["C2", 2, 1, 8, 0.051, 4.7446, "AVOID"],
  ["C3", 2, 2, 8, 0.0613, 4.6897, "AVOID"],
  ["C4", 2, 3, 7, 0.0679, 3.9577, "AVOID"],
  ["C5", 2, 4, 5, 0.074, 2.3928, "REVIEW"],
  ["D1", 3, 0, 4, 0, 2.079, "REVIEW"],
  ["D2", 3, 1, 4, 0, 2.8096, "REVIEW"],
  ["D3", 3, 2, 5, 0.0048, 2.9307, "REVIEW"],
  ["D4", 3, 3, 4, 0.0143, 2.5191, "REVIEW"],
  ["D5", 3, 4, 3, 0.0048, 1.7252, "PREFERRED"],
  ["E1", 4, 0, 3, 0, 1.2433, "PREFERRED"],
  ["E2", 4, 1, 3, 0, 1.5639, "PREFERRED"],
  ["E3", 4, 2, 3, 0, 1.6362, "PREFERRED"],
  ["E4", 4, 3, 3, 0, 1.4378, "PREFERRED"],
  ["E5", 4, 4, 2, 0.0083, 1.0664, "PREFERRED"],
].map(([id, row, col, risk, edgeDensity, circlePressure, classification]) => ({
  id: id as string,
  row: row as number,
  col: col as number,
  risk: risk as number,
  edgeDensity: edgeDensity as number,
  circlePressure: circlePressure as number,
  classification: classification as Zone["classification"],
}));

const circularFeatures = [
  { id: "CF-01", x: 161, y: 214, r: 113 },
  { id: "CF-02", x: 139, y: 244, r: 117 },
  { id: "CF-03", x: 253, y: 203, r: 109 },
  { id: "CF-04", x: 213, y: 194, r: 99 },
  { id: "CF-05", x: 291, y: 208, r: 105 },
];

const styles: Record<
  Zone["classification"],
  { bg: string; text: string; ring: string }
> = {
  PREFERRED: { bg: "rgba(83, 126, 78, .46)", text: "#e4f5dd", ring: "#b8dbaa" },
  REVIEW: { bg: "rgba(170, 125, 49, .45)", text: "#fff1cc", ring: "#ebd18c" },
  AVOID: { bg: "rgba(172, 61, 45, .53)", text: "#ffe8e4", ring: "#e7998d" },
};

function reason(zone: Zone) {
  if (zone.classification === "PREFERRED")
    return "No circular-feature intersection in the selected cell, low nearby edge density, and a comparatively open terrain footprint.";
  if (zone.classification === "REVIEW")
    return "Moderate terrain signal. Inspect the raw plate and adjacent cells before treating this as a viable landing alternative.";
  return "Elevated circular-feature pressure and/or edge activity makes this cell unsuitable for the primary approach.";
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("results");
  const [view, setView] = useState<View>("raw");
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(0);
  const [upload, setUpload] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDataUrl, setUploadDataUrl] = useState<string | null>(null);
  const [backendResult, setBackendResult] = useState<BackendSegmentationResult | null>(null);
  const [selectedId, setSelectedId] = useState("E5");
  const [evidenceLayer, setEvidenceLayer] = useState("RAW TERRAIN");
  const [labelSampleId, setLabelSampleId] = useState("MSL-01");
  const [labelView, setLabelView] = useState<LabelView>("overlay");
  const [pixelReading, setPixelReading] = useState<{
    x: number;
    y: number;
    value: number;
  } | null>(null);
  const [comparisonId, setComparisonId] = useState("MSL-01");
  const [comparisonView, setComparisonView] = useState<"source" | "prediction" | "groundTruth" | "disagreement">("prediction");
  const analyzeMutation = trpc.segmentation.analyze.useMutation({
    onSuccess: result => {
      setBackendResult(result);
      setStage("results");
      setView("prediction");
      setProgress(100);
      setComplete(6);
      toast.success("Server segmentation complete", { description: `Saved analysis ${result.analysisId.slice(0, 8)} uses ${result.model.label}.` });
    },
    onError: error => {
      setStage("mission");
      toast.error("Segmentation request failed", { description: error.message });
    },
  });

  const selected = useMemo(
    () => zones.find(zone => zone.id === selectedId) ?? zones[24],
    [selectedId]
  );
  const ranking = useMemo(
    () =>
      [...zones]
        .sort((a, b) => a.risk - b.risk || a.circlePressure - b.circlePressure)
        .slice(0, 5),
    []
  );
  const sourceName = upload ? uploadName : "curiosity_image_01.png";
  const primaryImage =
    view === "prediction" && backendResult
      ? backendResult.predictionUrl
      : view === "hazards" && backendResult
        ? backendResult.overlayUrl
        : upload ?? (view === "hazards" ? assets.hazards : assets.raw);
  const isVerified = !upload;
  const selectedLabeledTerrain =
    labeledTerrainSamples.find(sample => sample.id === labelSampleId) ??
    labeledTerrainSamples[0];
  const selectedComparison = modelComparisons.find(sample => sample.id === comparisonId) ?? modelComparisons[0];

  const scroll = (id: string) =>
    document
      .querySelector(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  const runAnalysis = (forceSample = false) => {
    if (upload && !forceSample) {
      if (!uploadDataUrl) {
        toast.error("Terrain file is still loading");
        return;
      }
      setStage("processing");
      setProgress(18);
      setComplete(2);
      analyzeMutation.mutate({ filename: uploadName || "terrain.png", dataUrl: uploadDataUrl });
      return;
    }
    setStage("processing");
    setProgress(0);
    setComplete(0);
    [14, 31, 50, 68, 84, 100].forEach((value, index) =>
      window.setTimeout(
        () => {
          setProgress(value);
          setComplete(index + 1);
          if (index === 5) {
            setStage("results");
            setView("raw");
            toast.success("Verified analysis ready", {
              description:
                "The terrain evidence, risk grid, and zone ranking are available for review.",
            });
            window.setTimeout(() => scroll("#evidence"), 180);
          }
        },
        (index + 1) * 310
      )
    );
  };

  const loadSample = () => {
    setUpload(null);
    setUploadName("");
    setSelectedId("E5");
    runAnalysis(true);
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Image file required");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUpload(URL.createObjectURL(file));
      setUploadName(file.name);
      setUploadDataUrl(String(reader.result));
      setBackendResult(null);
      setStage("mission");
      setView("raw");
      setProgress(0);
      setComplete(0);
      toast.success("Terrain image selected", { description: "Ready for the server-side segmentation baseline." });
    };
    reader.onerror = () => toast.error("Unable to read this terrain image");
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setStage("mission");
    setUpload(null);
    setUploadName("");
    setUploadDataUrl(null);
    setBackendResult(null);
    setProgress(0);
    setComplete(0);
    setView("raw");
    setSelectedId("E5");
    scroll("#mission");
  };

  const inspectLabelPixel = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(1023, Math.floor(((event.clientX - rect.left) / rect.width) * 1024))
    );
    const y = Math.max(
      0,
      Math.min(1023, Math.floor(((event.clientY - rect.top) / rect.height) * 1024))
    );
    const mask = new Image();
    mask.crossOrigin = "anonymous";
    mask.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(mask, 0, 0, 1024, 1024);
      const value = context.getImageData(x, y, 1, 1).data[0];
      setPixelReading({ x, y, value });
    };
    mask.onerror = () => toast.error("Unable to read this semantic mask");
    mask.src = selectedLabeledTerrain.rawMask;
  };

  const exportReport = () => {
    const report = {
      mission: "MB-01",
      source_image: sourceName,
      evidence_state: isVerified ? "verified OpenCV sample" : "staged upload",
      circular_feature_candidates: 22,
      edge_pixels: 10484,
      risk_engine:
        "0.32 × normalized edge density + 0.68 × circular-feature pressure",
      recommended_zone: selected.id,
      risk_score: `${selected.risk.toFixed(1)} / 10`,
      reason: reason(selected),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `marsbound-${selected.id}-analysis.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Analysis report exported");
  };

  const processingSteps = [
    "IMAGE RECEIVED",
    "TERRAIN PREPROCESSED",
    "ROCK EDGE DETECTION",
    "CIRCULAR FEATURE DETECTION",
    "RISK MAP GENERATED",
    "LANDING ZONES RANKED",
  ];
  const evidence = [
    {
      label: "RAW TERRAIN",
      image: assets.raw,
      description: "Original 500 × 500 source plate.",
    },
    {
      label: "PREPROCESSING",
      image: assets.normalized,
      description: "Grayscale contrast-normalized working image.",
    },
    {
      label: "ROCK EDGES",
      image: assets.edges,
      description: "Canny response overlaid in restrained red.",
    },
    {
      label: "CIRCULAR FEATURES",
      image: assets.circles,
      description: "Hough circle candidates and centers.",
    },
    {
      label: "COMBINED HAZARDS",
      image: assets.hazards,
      description: "Saved OpenCV annotated output.",
    },
  ];
  const selectedEvidence =
    evidence.find(item => item.label === evidenceLayer) ?? evidence[0];

  return (
    <main className="min-h-screen bg-[#070707] text-[#F2F0EA]">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleUpload}
      />
      <header className="border-b border-white/12 bg-[#070707]">
        <div className="mx-auto flex h-[68px] max-w-[1500px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <a href="#mission" className="flex items-center gap-3">
            <img src={assets.mark} alt="MARSBOUND mark" className="size-9" />
            <div>
              <p className="font-tech text-sm font-medium tracking-[.16em] text-white">
                MARSBOUND
              </p>
              <p className="font-mono text-[8px] uppercase tracking-[.16em] text-white/45">
                Landing Site Intelligence
              </p>
            </div>
          </a>
          <nav className="hidden items-center gap-7 font-mono text-[10px] uppercase tracking-[.14em] text-white/55 md:flex">
            <a href="#mission" className="hover:text-white">
              Mission
            </a>
            <a href="#analysis" className="hover:text-white">
              Analysis
            </a>
            <a href="#evidence" className="hover:text-white">
              Evidence
            </a>
            <a href="#labels" className="hover:text-white">
              Labels
            </a>
            <a href="#report" className="hover:text-white">
              Report
            </a>
          </nav>
          <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[.13em]">
            <span className="hidden text-white/50 sm:block">MISSION MB-01</span>
            <span className="inline-flex items-center gap-2 text-[#9BD392]">
              <span className="size-1.5 rounded-full bg-[#69AB63]" />
              SYSTEM READY
            </span>
          </div>
        </div>
      </header>

      <section id="mission" className="border-b border-white/12">
        <div className="mx-auto grid max-w-[1500px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[.72fr_1.28fr] lg:px-10 lg:py-16">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.19em] text-[#E26D61]">
              Descent brief / 01
            </p>
            <h1 className="mt-4 font-tech text-4xl tracking-[-.055em] text-white sm:text-5xl">
              Terrain loaded. Descent assessment ready.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/60">
              The verified terrain pass has resolved a preferred approach area.
              Inspect the computer-vision evidence before committing descent.
            </p>
            <div className="mt-8 border-t border-white/12 pt-5 font-mono text-[9px] uppercase tracking-[.14em] text-white/45">
              <p>Target / Mars</p>
              <p className="mt-2">Model / OpenCV classical vision</p>
              <p className="mt-2">Grid / 5 × 5 candidate zones</p>
            </div>
            <div className="mt-7 border-l-2 border-[#E13C2E] bg-[#100B09] px-4 py-4">
              <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#E26D61]">
                Current mission outcome
              </p>
              <div className="mt-2 flex items-end gap-3">
                <p className="font-tech text-4xl tracking-[-.07em] text-white">E5</p>
                <p className="pb-1 font-mono text-[10px] uppercase tracking-[.13em] text-[#A9DB9D]">Risk 2.0 / 10</p>
              </div>
              <p className="mt-2 text-sm leading-5 text-white/60">Recommended: no circular-feature intersection and low nearby edge response in the verified grid.</p>
            </div>
          </div>
          <div className="border border-white/15 bg-[#0B0B0B] p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-white/45">
                  Terrain selection
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[.11em] text-white/80">
                  {sourceName}
                </p>
              </div>
              <span
                className={`font-mono text-[9px] uppercase tracking-[.13em] ${isVerified ? "text-[#9BD392]" : "text-[#F0C56B]"}`}
              >
                {isVerified ? "verified sample" : "staged upload"}
              </span>
            </div>
            {isVerified && (
              <div className="flex items-center justify-between border-b border-[#69AB63]/35 bg-[#0C120C] px-3 py-2 font-mono text-[9px] uppercase tracking-[.13em]">
                <span className="text-white/55">Mission outcome / E5</span>
                <span className="text-[#A9DB9D]">
                  Risk 2.0 / 10 / recommended
                </span>
              </div>
            )}
            <div className="relative mt-4 aspect-[16/8] overflow-hidden border border-white/10 bg-black">
              <img
                src={upload ?? assets.raw}
                alt="Selected Martian terrain"
                className="h-full w-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,.52),transparent_45%)]" />
              {isVerified && (
                <LandingReticle className="absolute right-[17%] top-[31%] size-16 text-[#E26D61]" />
              )}
              <div className="absolute bottom-3 left-3 font-mono text-[9px] uppercase tracking-[.14em] text-white/70">
                {upload
                  ? "IMAGE STAGED / READY FOR API"
                  : "CURIOUSITY TEST PLATE / SAVED RESULT AVAILABLE"}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                onClick={() => inputRef.current?.click()}
                variant="outline"
                className="h-10 rounded-none border-white/25 bg-transparent font-mono text-[9px] uppercase tracking-[.13em] text-white hover:bg-white hover:text-black"
              >
                <Upload className="mr-2 size-3.5" /> Select terrain
              </Button>
              <Button
                onClick={loadSample}
                className="h-10 rounded-none bg-white font-mono text-[9px] uppercase tracking-[.13em] text-black hover:bg-[#E13C2E] hover:text-white"
              >
                <FileImage className="mr-2 size-3.5" /> Choose NASA terrain
                sample
              </Button>
              <Button
                onClick={() => runAnalysis()}
                className="h-10 rounded-none bg-[#E13C2E] font-mono text-[9px] uppercase tracking-[.13em] text-white hover:bg-[#F04A3B]"
              >
                <ScanLine className="mr-2 size-3.5" /> Analyze terrain
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1500px] px-5 pb-8 sm:px-8 lg:px-10">
          <div className="grid border border-white/12 bg-[#090909] sm:grid-cols-5">
            {[
              ["01", "Acquire", "terrain loaded"],
              ["02", "Process", "vision pass"],
              ["03", "Evidence", "inspect signals"],
              ["04", "Labels", "review terrain classes"],
              ["05", "Decide", "E5 recommended"],
            ].map(([number, title, state], index) => (
              <div key={title} className={`flex items-center gap-3 border-b border-white/10 px-4 py-3 sm:border-b-0 sm:border-r ${index === 4 ? "border-r-0 bg-[#0C120C]" : ""}`}>
                <span className={`font-mono text-[9px] ${index === 4 ? "text-[#E26D61]" : "text-white/35"}`}>{number}</span>
                <span><span className="block font-mono text-[9px] uppercase tracking-[.13em] text-white/75">{title}</span><span className="mt-1 block font-mono text-[8px] uppercase tracking-[.1em] text-white/40">{state}</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="analysis" className="border-b border-white/12 bg-[#090909]">
        <div className="mx-auto max-w-[1500px] px-5 py-12 sm:px-8 lg:px-10 lg:py-14">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.19em] text-[#E26D61]">
                02 / Computer vision review
              </p>
              <h2 className="mt-3 font-tech text-3xl tracking-[-.05em] text-white sm:text-4xl">
                Verified descent review
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-white/55">
              The terrain plate remains fixed as the primary object. Visual
              modes expose evidence derived from the same source image.
            </p>
          </div>
          {stage === "processing" && (
            <ProcessingPanel
              progress={progress}
              completed={complete}
              steps={processingSteps}
            />
          )}
          {stage === "awaiting-api" && (
            <div className="mt-8 border-l-2 border-[#F0C56B] bg-[#12110D] px-5 py-4">
              <p className="font-mono text-[10px] uppercase tracking-[.15em] text-[#F0C56B]">
                Server analysis required
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65">
                The selected upload has been preserved in the browser. A backend
                endpoint is required to return verified edge maps, circular
                features, zones, and a landing recommendation for this file.
              </p>
            </div>
          )}
          {stage !== "results" &&
            stage !== "processing" &&
            stage !== "awaiting-api" && (
              <div className="mt-8 border border-dashed border-white/20 p-8 text-center">
                <p className="font-mono text-[10px] uppercase tracking-[.16em] text-white/45">
                  Select a terrain image, then run analysis
                </p>
                <p className="mt-3 text-sm text-white/55">
                  Use the verified sample to inspect the complete local result
                  without a backend.
                </p>
              </div>
            )}
          {stage === "results" && (
            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <article className="border border-white/15 bg-[#0A0A0A] p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <ScanLine className="size-4 text-[#E13C2E]" />
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-white/45">
                        Terrain evidence viewport
                      </p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[.11em] text-white/80">
                        {sourceName} / 500 × 500 PX
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-[.13em] text-[#9BD392]">
                    Analysis complete
                  </span>
                </div>
                <div className="relative mt-3 aspect-square overflow-hidden border border-white/10 bg-black">
                  <img
                    src={primaryImage}
                    alt="Mars terrain analysis"
                    className={`absolute inset-0 h-full w-full object-cover ${view === "zones" ? "opacity-50" : ""}`}
                  />
                  {isVerified && (view === "risk" || view === "zones") && (
                    <RiskGrid selected={selectedId} onSelect={setSelectedId} />
                  )}
                  {view === "zones" && (
                    <div className="pointer-events-none absolute bottom-[1%] left-[80%] grid h-[19%] w-[19%] place-items-center border-2 border-[#D6F0CF] bg-[#69AB63]/20">
                      <div className="text-center">
                        <MapPin className="mx-auto size-4 text-[#D6F0CF]" />
                        <span className="font-mono text-[9px] uppercase tracking-[.14em] text-[#D6F0CF]">
                          E5
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-px border border-white/15 bg-white/15">
                  {(["raw", "hazards", ...(backendResult ? ["prediction"] : []), "risk", "zones"] as View[]).map(item => (
                    <button
                      key={item}
                      onClick={() => setView(item)}
                      className={`px-4 py-2 font-mono text-[9px] uppercase tracking-[.13em] ${view === item ? "bg-white text-black" : "bg-[#0A0A0A] text-white/55 hover:text-white"}`}
                    >
                      {item === "raw"
                        ? "Raw"
                        : item === "hazards"
                          ? "Hazards"
                          : item === "prediction"
                            ? "Server prediction"
                          : item === "risk"
                            ? "Risk Map"
                            : "Landing Zones"}
                    </button>
                  ))}
                </div>
              </article>
              <aside className="border border-white/15 bg-[#0A0A0A]">
                <div className="border-b border-white/10 p-5">
                  <p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#E26D61]">
                    Analysis status
                  </p>
                  <h3 className="mt-2 font-tech text-2xl tracking-[-.04em] text-white">
                    Complete
                  </h3>
                </div>
                <dl className="divide-y divide-white/10">
                  <Stat
                    label="Circular candidates"
                    value="22"
                    note="Hough circle transform"
                  />
                  <Stat
                    label="Edge response"
                    value="10,484"
                    note="Canny edge pixels"
                  />
                  <Stat
                    label="Candidate zones"
                    value="25"
                    note="5 × 5 terrain grid"
                  />
                  <Stat
                    label="Preferred zones"
                    value="7"
                    note="risk score ≤ 3"
                  />
                </dl>
                <div className="p-5">
                  <p className="font-mono text-[9px] uppercase tracking-[.14em] text-white/40">
                    Source result
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Verified local OpenCV pass. Circular candidates and edge
                    response remain visible for review rather than being
                    presented as confirmed geology.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>

      {stage === "results" && (
        <>
          <section
            id="evidence"
            className="border-b border-white/12 bg-[#070707]"
          >
            <div className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 lg:px-10">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.19em] text-[#E26D61]">
                    03 / Detector evidence
                  </p>
                  <h2 className="mt-3 font-tech text-3xl tracking-[-.05em] text-white sm:text-4xl">
                    Inspect the algorithm, not just the answer.
                  </h2>
                </div>
                <p className="max-w-md text-sm leading-6 text-white/55">
                  Each plate is generated from the same verified source image.
                  Select a stage to inspect its real saved output.
                </p>
              </div>
              <div className="mt-8 grid gap-px border border-white/15 bg-white/15 md:grid-cols-5">
                {evidence.map(item => (
                  <button
                    key={item.label}
                    onClick={() => setEvidenceLayer(item.label)}
                    className={`group bg-[#090909] p-3 text-left ${evidenceLayer === item.label ? "bg-[#161616]" : "hover:bg-[#111]"}`}
                  >
                    <div className="aspect-square overflow-hidden border border-white/10">
                      <img
                        src={item.image}
                        alt={item.label}
                        className="h-full w-full object-cover grayscale-[.18] transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <p className="mt-3 font-mono text-[9px] uppercase tracking-[.13em] text-white">
                      {item.label}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-white/45">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
              <div className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
                <div className="border border-white/15 p-5">
                  <div className="relative overflow-hidden border border-white/10 bg-black">
                    <img
                      src={selectedEvidence.image}
                      alt={selectedEvidence.label}
                      className="aspect-[16/8] w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/75 px-3 py-2 font-mono text-[9px] uppercase tracking-[.13em] text-white/80">
                      {selectedEvidence.label}
                    </div>
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#E26D61]">
                    Selected evidence / {evidenceLayer}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-white/60">
                    {selectedEvidence.description} Follow the sequence from RAW
                    TERRAIN → PREPROCESSING → CANNY EDGE DETECTION → HOUGH
                    CIRCLE DETECTION → HAZARD MAP → RISK GRID.
                  </p>
                </div>
                <div className="border border-white/15">
                  <div className="border-b border-white/10 p-5">
                    <p className="font-mono text-[10px] uppercase tracking-[.16em] text-white/45">
                      Circular feature coordinates
                    </p>
                    <p className="mt-2 text-sm text-white/60">
                      Sample of actual Hough candidates from the verified
                      result. Radius is measured in source pixels.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] border-collapse font-mono text-[10px] uppercase tracking-[.1em]">
                      <thead className="text-left text-white/40">
                        <tr className="border-b border-white/10">
                          <th className="px-5 py-3 font-normal">ID</th>
                          <th className="px-5 py-3 font-normal">Type</th>
                          <th className="px-5 py-3 font-normal">X</th>
                          <th className="px-5 py-3 font-normal">Y</th>
                          <th className="px-5 py-3 font-normal">Radius</th>
                        </tr>
                      </thead>
                      <tbody>
                        {circularFeatures.map(feature => (
                          <tr
                            key={feature.id}
                            className="border-b border-white/10 text-white/70"
                          >
                            <td className="px-5 py-3 text-[#9BD392]">
                              {feature.id}
                            </td>
                            <td className="px-5 py-3">Circular feature</td>
                            <td className="px-5 py-3">{feature.x}</td>
                            <td className="px-5 py-3">{feature.y}</td>
                            <td className="px-5 py-3">{feature.r} PX</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="labels" className="border-b border-white/12 bg-[#0A0A0A]">
            <div className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 lg:px-10">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.19em] text-[#E26D61]">
                    04 / Label evidence / matched MSL pairs
                  </p>
                  <h2 className="mt-3 font-tech text-3xl tracking-[-.05em] text-white sm:text-4xl">
                    Terrain classes, inspected directly.
                  </h2>
                </div>
                <p className="max-w-md text-sm leading-6 text-white/55">
                  These are directly matched MSL Navcam source images and merged AI4Mars semantic masks. Colors denote annotation classes—not detector predictions.
                </p>
              </div>
              <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
                <article className="border border-white/15 bg-[#090909] p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-white/45">Semantic terrain plate</p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[.11em] text-white/80">{selectedLabeledTerrain.imageId} / 1024 × 1024 PX</p>
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-[.13em] text-[#9BD392]">Merged label / {selectedLabeledTerrain.coverage} coverage</span>
                  </div>
                  <button onClick={inspectLabelPixel} className="relative mt-3 block w-full overflow-hidden border border-white/10 bg-black text-left focus:outline-none focus:ring-1 focus:ring-[#E26D61]" aria-label="Inspect label class at this terrain position">
                    <img src={labelView === "source" ? selectedLabeledTerrain.source : labelView === "overlay" ? selectedLabeledTerrain.overlay : selectedLabeledTerrain.mask} alt={`${labelView} view of matched MSL terrain sample`} className="aspect-square w-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-black/80 px-3 py-2 font-mono text-[9px] uppercase tracking-[.13em] text-white/75"><span>Click terrain to inspect label</span><span>{labelView === "source" ? "Source image" : labelView === "overlay" ? "Semantic overlay" : "Class mask"}</span></div>
                  </button>
                  <div className="mt-3 flex flex-wrap gap-px border border-white/15 bg-white/15">
                    {(["source", "overlay", "mask"] as LabelView[]).map(item => <button key={item} onClick={() => setLabelView(item)} className={`px-4 py-2 font-mono text-[9px] uppercase tracking-[.13em] ${labelView === item ? "bg-white text-black" : "bg-[#0A0A0A] text-white/55 hover:text-white"}`}>{item === "source" ? "Source" : item === "overlay" ? "Overlay" : "Class mask"}</button>)}
                  </div>
                </article>
                <aside className="border border-white/15 bg-[#090909]">
                  <div className="border-b border-white/10 p-5"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#E26D61]">Pixel inspection</p><p className="mt-3 font-tech text-2xl tracking-[-.04em] text-white">{pixelReading ? terrainClasses[pixelReading.value]?.name ?? "Unknown" : "Select a point"}</p><p className="mt-2 font-mono text-[9px] uppercase tracking-[.12em] text-white/45">{pixelReading ? `X ${pixelReading.x} / Y ${pixelReading.y} / VALUE ${pixelReading.value}` : "Read exact mask value from 1024 × 1024 label"}</p></div>
                  <div className="divide-y divide-white/10">{[0, 1, 2, 3, 255].map(value => <div key={value} className="flex items-center justify-between gap-3 px-5 py-3"><span className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[.12em] text-white/70"><span className="size-3 border border-white/20" style={{ backgroundColor: terrainClasses[value].color }} />{terrainClasses[value].name}</span><span className="font-mono text-[9px] text-white/40">{selectedLabeledTerrain.counts[value as keyof typeof selectedLabeledTerrain.counts].toLocaleString()} PX</span></div>)}</div>
                  <div className="p-5 text-sm leading-6 text-white/55">The current sample includes {selectedLabeledTerrain.classes.map(value => terrainClasses[value].name.toLowerCase()).join(", ")}. Unlabeled pixels are intentionally excluded from terrain-class claims.</div>
                </aside>
              </div>
              <div className="mt-6 grid gap-px border border-white/15 bg-white/15 md:grid-cols-3">{labeledTerrainSamples.map(sample => <button key={sample.id} onClick={() => { setLabelSampleId(sample.id); setLabelView("overlay"); setPixelReading(null); }} className={`flex gap-4 bg-[#090909] p-4 text-left ${sample.id === selectedLabeledTerrain.id ? "bg-[#151515]" : "hover:bg-[#111]"}`}><img src={sample.overlay} alt="" className="size-16 shrink-0 border border-white/10 object-cover" /><span><span className="block font-mono text-[9px] uppercase tracking-[.13em] text-white">{sample.id}</span><span className="mt-2 block text-xs leading-5 text-white/50">{sample.coverage} labeled area · {sample.classes.map(value => terrainClasses[value].name).join(" / ")}</span></span></button>)}</div>
            </div>
          </section>

          <section id="comparison" className="border-b border-white/12 bg-[#070707]">
            <div className="mx-auto max-w-[1500px] px-5 py-14 sm:px-8 lg:px-10">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.19em] text-[#E26D61]">05 / Segmentation validation</p>
                  <h2 className="mt-3 font-tech text-3xl tracking-[-.05em] text-white sm:text-4xl">Prediction against ground truth.</h2>
                </div>
                <p className="max-w-md text-sm leading-6 text-white/55">The archive plate preserves visible error evidence from the retired prototype baseline. The live server now uses the promoted MobileNetV3-U-Net; its reported test metrics come only from a separate fixed 300-image AI4Mars split.</p>
              </div>
              <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
                <article className="border border-white/15 bg-[#090909] p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3"><div><p className="font-mono text-[9px] uppercase tracking-[.15em] text-white/45">Archived review plate</p><p className="mt-1 font-mono text-[10px] uppercase tracking-[.11em] text-white/80">{selectedComparison.id} / retired prototype baseline</p></div><span className="font-mono text-[9px] uppercase tracking-[.13em] text-[#F0C56B]">Evidence view</span></div>
                  <img src={comparisonView === "source" ? selectedComparison.source : comparisonView === "prediction" ? selectedComparison.prediction : comparisonView === "groundTruth" ? selectedComparison.groundTruth : selectedComparison.disagreement} alt={`${comparisonView} for ${selectedComparison.id}`} className="mt-3 aspect-square w-full border border-white/10 object-cover" />
                  <div className="mt-3 flex flex-wrap gap-px border border-white/15 bg-white/15">{(["source", "prediction", "groundTruth", "disagreement"] as const).map(item => <button key={item} onClick={() => setComparisonView(item)} className={`px-3 py-2 font-mono text-[9px] uppercase tracking-[.12em] ${comparisonView === item ? "bg-white text-black" : "bg-[#0A0A0A] text-white/55 hover:text-white"}`}>{item === "groundTruth" ? "Ground truth" : item}</button>)}</div>
                </article>
                <aside className="border border-white/15 bg-[#090909]"><div className="border-b border-white/10 p-5"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[#E26D61]">Archived comparison</p><p className="mt-3 font-tech text-3xl tracking-[-.05em] text-white">{selectedComparison.id}</p><p className="mt-2 text-sm text-white/55">{selectedComparison.note}</p></div><dl className="divide-y divide-white/10"><Stat label="Pixel accuracy" value={selectedComparison.accuracy} note="retired baseline; labelled pixels" /><Stat label="Macro F1" value={selectedComparison.macroF1} note="retired baseline; unweighted classes" /><Stat label="Archive source" value="49" note="matched MSL image-mask pairs" /></dl><div className="border-t border-[#69AB63]/35 bg-[#0C120C] p-5"><p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#A9DB9D]">Current server model</p><p className="mt-2 text-sm leading-6 text-white/70">MobileNetV3-U-Net v1 earned <span className="text-white">82.02% pixel accuracy</span> and <span className="text-white">81.75% macro F1</span> on the untouched 300-image test split; sand F1 was 78.49% and big-rock F1 was 82.15%.</p><p className="mt-2 text-xs leading-5 text-white/50">These are test-set metrics, not promises for this plate or a new upload. Outputs remain research decision-support evidence, not flight-qualified landing clearance.</p></div></aside>
              </div>
              <div className="mt-6 grid gap-px border border-white/15 bg-white/15 md:grid-cols-3">{modelComparisons.map(sample => <button key={sample.id} onClick={() => { setComparisonId(sample.id); setComparisonView("prediction"); }} className={`flex items-center justify-between bg-[#090909] px-4 py-4 text-left ${sample.id === selectedComparison.id ? "bg-[#151515]" : "hover:bg-[#111]"}`}><span><span className="block font-mono text-[9px] uppercase tracking-[.13em] text-white">{sample.id}</span><span className="mt-1 block font-mono text-[9px] uppercase tracking-[.1em] text-white/45">Acc {sample.accuracy} / F1 {sample.macroF1}</span></span><ChevronRight className="size-4 text-[#E26D61]" /></button>)}</div>
              {backendResult && <div className="mt-6 border-l-2 border-[#69AB63] bg-[#0C120C] px-5 py-4"><p className="font-mono text-[10px] uppercase tracking-[.15em] text-[#A9DB9D]">Latest uploaded-image result</p><p className="mt-2 text-sm leading-6 text-white/65">Saved analysis <span className="font-mono text-white">{backendResult.analysisId}</span> produced a {backendResult.width} × {backendResult.height} prediction. Ground truth is unavailable for arbitrary uploads; comparison metrics are only shown for matched AI4Mars samples.</p></div>}
            </div>
          </section>

          <section id="report" className="bg-[#090909]">
            <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:px-10">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.19em] text-[#E26D61]">
                  05 / Decision / landing zone ranking
                </p>
                <h2 className="mt-3 font-tech text-3xl tracking-[-.05em] text-white sm:text-4xl">
                  Candidate zone assessment
                </h2>
                <div className="mt-7 overflow-x-auto border border-white/15">
                  <table className="w-full min-w-[620px] border-collapse font-mono text-[10px] uppercase tracking-[.11em]">
                    <thead className="border-b border-white/10 text-left text-white/40">
                      <tr>
                        <th className="px-5 py-4 font-normal">Rank</th>
                        <th className="px-5 py-4 font-normal">Zone</th>
                        <th className="px-5 py-4 font-normal">Risk</th>
                        <th className="px-5 py-4 font-normal">Edge density</th>
                        <th className="px-5 py-4 font-normal">Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((zone, index) => (
                        <tr
                          key={zone.id}
                          onClick={() => {
                            setSelectedId(zone.id);
                            setView("zones");
                            scroll("#analysis");
                          }}
                          className={`cursor-pointer border-b border-white/10 ${zone.id === selected.id ? "bg-[#69AB63]/[.08]" : "hover:bg-white/[.025]"}`}
                        >
                          <td className="px-5 py-4 text-white/35">
                            {String(index + 1).padStart(2, "0")}
                          </td>
                          <td className="px-5 py-4 text-lg text-white">
                            {zone.id}
                          </td>
                          <td className="px-5 py-4 text-[#9BD392]">
                            {zone.risk.toFixed(1)} / 10
                          </td>
                          <td className="px-5 py-4 text-white/60">
                            {(zone.edgeDensity * 100).toFixed(2)}%
                          </td>
                          <td className="px-5 py-4 text-white/60">
                            {index === 0 ? "RECOMMENDED" : "ALTERNATE"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <aside className="relative overflow-hidden border border-[#E13C2E]/70 bg-[#0D130D] p-6">
                <div className="absolute inset-x-0 top-0 h-1 bg-[#E13C2E]" />
                <LandingReticle className="absolute right-5 top-5 size-16 text-[#E13C2E]/70" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[.17em] text-[#A9DB9D]">
                      Official mission output
                    </p>
                    <h3 className="mt-5 font-tech text-7xl leading-none tracking-[-.09em] text-white">
                      {selected.id}
                    </h3>
                  </div>
                  <ShieldCheck className="size-6 text-[#A9DB9D]" />
                </div>
                <div className="mt-7 border-y border-[#69AB63]/35 py-5">
                  <p className="font-mono text-[9px] uppercase tracking-[.14em] text-white/45">
                    Risk score
                  </p>
                  <p className="mt-2 font-tech text-4xl tracking-[-.06em] text-[#E7F4E2]">
                    {selected.risk.toFixed(1)}{" "}
                    <span className="font-mono text-sm tracking-normal">
                      / 10
                    </span>
                  </p>
                  <p className="mt-5 font-mono text-[9px] uppercase tracking-[.14em] text-[#A9DB9D]">
                    Evidence confidence / High
                  </p>
                </div>
                <div className="mt-6 space-y-3 text-sm leading-6 text-white/70">
                  <p className="flex gap-3">
                    <Check className="mt-1 size-4 shrink-0 text-[#A9DB9D]" />
                    No circular-feature intersection in the selected cell.
                  </p>
                  <p className="flex gap-3">
                    <Check className="mt-1 size-4 shrink-0 text-[#A9DB9D]" />
                    Low nearby rock-edge response in the computed grid.
                  </p>
                  <p className="flex gap-3">
                    <Check className="mt-1 size-4 shrink-0 text-[#A9DB9D]" />
                    Largest open candidate area among ranked zones.
                  </p>
                  <p className="flex gap-3">
                    <Check className="mt-1 size-4 shrink-0 text-[#A9DB9D]" />
                    Lowest risk output in the verified local pass.
                  </p>
                </div>
                <div className="mt-7 flex gap-3">
                  <Button
                    onClick={() => scroll("#evidence")}
                    variant="outline"
                    className="h-10 flex-1 rounded-none border-white/30 bg-transparent font-mono text-[9px] uppercase tracking-[.13em] text-white hover:bg-white hover:text-black"
                  >
                    <Info className="mr-2 size-3.5" /> View evidence
                  </Button>
                  <Button
                    onClick={exportReport}
                    className="h-10 flex-1 rounded-none bg-white font-mono text-[9px] uppercase tracking-[.13em] text-black hover:bg-[#E13C2E] hover:text-white"
                  >
                    <ArrowDownToLine className="mr-2 size-3.5" /> Export report
                  </Button>
                </div>
              </aside>
            </div>
          </section>
        </>
      )}

      <footer className="border-t border-white/12 bg-[#070707]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div className="flex items-center gap-3">
            <img src={assets.mark} alt="" className="size-8" />
            <p className="font-mono text-[9px] uppercase tracking-[.15em] text-white/55">
              MARSBOUND / Landing Site Intelligence
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-mono text-[8px] uppercase tracking-[.13em] text-white/35">
              MB-01 / OpenCV classical vision / local demo
            </p>
            {stage === "results" && (
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.13em] text-white/60 hover:text-white"
              >
                <RefreshCw className="size-3.5" /> New analysis
              </button>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}

function ProcessingPanel({
  progress,
  completed,
  steps,
}: {
  progress: number;
  completed: number;
  steps: string[];
}) {
  return (
    <div className="mt-8 grid gap-6 border border-white/15 bg-[#0B0B0B] p-5 sm:grid-cols-[.8fr_1.2fr] sm:p-7">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[.17em] text-[#E26D61]">
          Instrument sequence
        </p>
        <h3 className="mt-3 font-tech text-3xl tracking-[-.05em] text-white">
          Processing terrain
        </h3>
        <p className="mt-3 text-sm leading-6 text-white/55">
          Saved sample data is being surfaced through the scientific review
          sequence.
        </p>
        <p className="mt-8 font-mono text-2xl tracking-[-.06em] text-white">
          {progress}%
        </p>
      </div>
      <div>
        <div className="h-px bg-white/15">
          <div
            className="h-px bg-[#E13C2E] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-5 grid gap-x-8 sm:grid-cols-2">
          {steps.map((step, index) => (
            <div
              key={step}
              className="flex items-center gap-3 border-b border-white/10 py-3 font-mono text-[9px] uppercase tracking-[.12em] text-white/55"
            >
              {index < completed ? (
                <Check className="size-3.5 text-[#9BD392]" />
              ) : index === completed ? (
                <LoaderCircle className="size-3.5 animate-spin text-[#F0C56B]" />
              ) : (
                <span className="size-3.5 rounded-full border border-white/25" />
              )}
              <span className={index < completed ? "text-white" : ""}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <dt className="font-mono text-[9px] uppercase tracking-[.13em] text-white/45">
          {label}
        </dt>
        <dd className="mt-1 text-xs text-white/55">{note}</dd>
      </div>
      <span className="font-tech text-3xl tracking-[-.06em] text-white">
        {value}
      </span>
    </div>
  );
}

function RiskGrid({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="absolute inset-0 grid grid-cols-5 grid-rows-5">
      {zones.map(zone => {
        const tone = styles[zone.classification];
        return (
          <button
            key={zone.id}
            onClick={() => onSelect(zone.id)}
            className="relative flex min-h-0 flex-col justify-between border border-white/30 p-1 text-left sm:p-2"
            style={{
              background: tone.bg,
              color: tone.text,
              boxShadow:
                zone.id === selected
                  ? `inset 0 0 0 2px ${tone.ring}`
                  : undefined,
            }}
          >
            <span className="font-mono text-[8px] uppercase tracking-[.1em] sm:text-[10px]">
              {zone.id}
            </span>
            <span className="self-end font-mono text-sm sm:text-lg">
              {zone.risk}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function LandingReticle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <circle
        cx="32"
        cy="32"
        r="17"
        fill="rgba(0,0,0,.25)"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle
        cx="32"
        cy="32"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M32 2v17M32 45v17M2 32h17M45 32h17"
        stroke="currentColor"
        strokeWidth="1"
        opacity=".78"
      />
      <path d="M29 29h6v6h-6z" fill="currentColor" />
    </svg>
  );
}
