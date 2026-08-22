/**
 * Terrain Signal Desk design: field-journal warmth, editorial science typography,
 * asymmetrical evidence-first layout, and oxide/green analytical marks.
 */
import { Button } from "@/components/ui/button";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleDotDashed,
  FileImage,
  FlaskConical,
  Layers3,
  MoveHorizontal,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  Upload,
} from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";

const assets = {
  hero: "/manus-storage/mars-terrain-hero_bb6c1127.jpg",
  fieldPlate: "/manus-storage/mars-detection-fieldplate_9dab9fbe.jpg",
  texture: "/manus-storage/regolith-paper-texture_c6c6a5a5.jpg",
  detail: "/manus-storage/mars-analysis-detail_1dacff31.jpg",
  mark: "/manus-storage/terrain-signal-mark_7107ec4d.png",
  sampleOriginal: "/manus-storage/curiosity_image_01_95938ea6.png",
  sampleAnnotated: "/manus-storage/curiosity_image_01_annotated_71856f00.png",
  contactSheet: "/manus-storage/curiosity_annotated_contact_sheet_a96f210a.jpg",
};

const readings = [
  { label: "Candidate circles", value: "22", note: "Hough candidates" },
  { label: "Edge pixels", value: "10,484", note: "Canny response" },
  { label: "Plate scale", value: "500 × 500", note: "source pixels" },
];

function Metric({ label, value, note }: (typeof readings)[number]) {
  return (
    <div className="border-l border-[#D4C7B5] pl-4 first:border-l-0 first:pl-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#6D6258]">{label}</p>
      <p className="mt-1 font-mono text-2xl font-medium tracking-[-0.06em] text-[#27221E]">{value}</p>
      <p className="mt-1 text-xs text-[#817468]">{note}</p>
    </div>
  );
}

export default function Home() {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [comparison, setComparison] = useState(47);
  const [showOverlay, setShowOverlay] = useState(true);
  const [cannyLow, setCannyLow] = useState(50);
  const [cannyHigh, setCannyHigh] = useState(150);
  const [circleEvidence, setCircleEvidence] = useState(50);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string>("");

  const useVerifiedPass = () => {
    setUploadedImage(null);
    setUploadedName("");
    setShowOverlay(true);
    toast.success("Verified Curiosity pass loaded", {
      description: "Showing the saved OpenCV output for Sol sample 01.",
    });
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file", { description: "PNG, JPG, or another browser-readable image is required." });
      return;
    }
    setUploadedImage(URL.createObjectURL(file));
    setUploadedName(file.name);
    setShowOverlay(false);
    toast.message("Raw plate staged", {
      description: "The viewer can inspect your image; validated detections remain available through the Python workflow.",
    });
  };

  const downloadSummary = () => {
    const csv = [
      "image,width,height,edge_pixels,candidate_circles,run_profile",
      "curiosity_image_01.png,500,500,10484,22,canny_50_150_hough_50",
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "terrain-signal-sample-summary.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Sample summary downloaded");
  };

  const currentName = uploadedImage ? uploadedName : "curiosity_image_01.png";

  return (
    <main className="min-h-screen overflow-hidden bg-[#EFE8DB] text-[#27221E]">
      <div
        className="fixed inset-0 -z-10 opacity-[0.42]"
        style={{ backgroundImage: `url(${assets.texture})`, backgroundSize: "520px 346px" }}
      />

      <header className="border-b border-[#D4C7B5]/85 bg-[#EFE8DB]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <a href="#top" className="group flex items-center gap-3" aria-label="Terrain Signal home">
            <img src={assets.mark} alt="Terrain Signal symbol" className="h-10 w-10 object-contain transition-transform duration-200 group-hover:-rotate-6" />
            <div className="leading-none">
              <p className="font-display text-[17px] font-semibold tracking-[-0.06em]">TERRAIN / SIGNAL</p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[#796C60]">Mars image analysis desk</p>
            </div>
          </a>
          <nav className="hidden items-center gap-7 font-mono text-[11px] uppercase tracking-[0.13em] text-[#5F554C] md:flex">
            <a className="transition-colors hover:text-[#C84A2C]" href="#workspace">Workspace</a>
            <a className="transition-colors hover:text-[#C84A2C]" href="#method">Method</a>
            <a className="transition-colors hover:text-[#C84A2C]" href="#evidence">Evidence</a>
          </nav>
          <Button onClick={downloadSummary} className="h-10 rounded-full bg-[#27221E] px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#F7F1E7] hover:bg-[#C84A2C]">
            Export sample <ArrowDownToLine className="ml-2 size-3.5" />
          </Button>
        </div>
      </header>

      <section id="top" className="relative mx-auto max-w-[1440px] px-5 pb-14 pt-10 sm:px-8 sm:pt-14 lg:px-12 lg:pb-20">
        <div className="grid items-end gap-10 lg:grid-cols-[1.06fr_.94fr]">
          <div className="relative z-10 max-w-3xl lg:pb-2">
            <div className="mb-7 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#9A3E28]">
              <span className="h-px w-10 bg-[#C84A2C]" /> Field plate 01 · Curiosity archive
            </div>
            <h1 className="font-display max-w-3xl text-[clamp(3.3rem,7vw,7.2rem)] leading-[0.87] tracking-[-0.075em] text-[#27221E]">
              Read the terrain,<br />
              <em className="font-normal text-[#C84A2C]">layer by layer.</em>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-[#5F554C] sm:text-lg">
              An evidence-first viewer for the Curiosity image workflow: inspect raw terrain, compare a verified OpenCV pass, and see where edge and circular-feature candidates deserve a closer look.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button onClick={() => document.querySelector("#workspace")?.scrollIntoView({ behavior: "smooth" })} className="h-12 rounded-full bg-[#C84A2C] px-6 text-sm text-white hover:bg-[#A93B25]">
                Inspect the sample <ChevronRight className="ml-1 size-4" />
              </Button>
              <Button variant="outline" onClick={() => uploadRef.current?.click()} className="h-12 rounded-full border-[#BFB1A0] bg-[#F7F1E7]/70 px-5 text-sm text-[#352F29] hover:bg-white">
                <Upload className="mr-2 size-4" /> Stage a raw plate
              </Button>
            </div>
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-[2rem] border border-[#CFC0AD] shadow-[0_24px_70px_rgba(52,39,27,0.16)] sm:min-h-[390px]">
            <img src={assets.hero} alt="Curiosity-style view across a Martian rock field" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#2E241C]/70 via-transparent to-[#F5E2C5]/20" />
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between border-t border-white/30 pt-3 text-white">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/70">Mission context</p>
                <p className="mt-1 font-display text-xl tracking-[-0.04em]">Surface evidence, not spectacle.</p>
              </div>
              <div className="hidden rounded-full bg-black/25 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] backdrop-blur-sm sm:block">Sol sample</div>
            </div>
          </div>
        </div>
      </section>

      <section id="workspace" className="border-y border-[#D4C7B5] bg-[#F7F1E7]/72">
        <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12">
          <div className="grid gap-5 md:grid-cols-3">
            {readings.map((reading) => <Metric key={reading.label} {...reading} />)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#9A3E28]">
              <span className="h-2 w-2 rounded-full bg-[#C84A2C]" /> Analysis workspace
            </div>
            <h2 className="mt-3 font-display text-4xl tracking-[-0.06em] sm:text-5xl">The verified pass.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[#665B51]">Red marks are Canny edge responses. Green rings and blue centers mark Hough circle candidates from the saved detector run.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_355px]">
          <article className="relative overflow-hidden rounded-[2rem] border border-[#CFC0AD] bg-[#29241F] p-3 shadow-[0_20px_55px_rgba(49,34,21,0.15)] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 px-1 text-[#F6EDE1]">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-white/10"><ScanLine className="size-4" /></span>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.17em] text-white/55">Image plate</p>
                  <p className="mt-0.5 text-sm font-medium">{currentName}</p>
                </div>
              </div>
              {!uploadedImage && <span className="rounded-full border border-[#A6D999]/40 bg-[#A6D999]/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#B7E5AC]">verified output</span>}
              {uploadedImage && <span className="rounded-full border border-[#E9B18C]/40 bg-[#C84A2C]/20 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#FFD4B8]">raw upload</span>}
            </div>

            {!uploadedImage ? (
              <>
                <div className="relative aspect-square overflow-hidden rounded-[1.4rem] bg-black">
                  <img src={assets.sampleOriginal} alt="Original Curiosity Mars rock image" className="absolute inset-0 h-full w-full object-cover" />
                  <img
                    src={assets.sampleAnnotated}
                    alt="Annotated Curiosity Mars rock image with edge and circle detections"
                    className="absolute inset-0 h-full w-full object-cover transition-[clip-path] duration-200"
                    style={{ clipPath: showOverlay ? `inset(0 0 0 ${comparison}%)` : "inset(0 0 0 100%)" }}
                  />
                  <div className="pointer-events-none absolute inset-y-0 w-px bg-[#F7F1E7] shadow-[0_0_0_1px_rgba(0,0,0,.28)]" style={{ left: `${comparison}%` }} />
                  <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-white">raw</div>
                  <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#273224]/85 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#D3F3CD]">annotated</div>
                  <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/55 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/80"><MoveHorizontal className="size-3" /> drag the divider</div>
                </div>
                <input
                  aria-label="Before and after comparison position"
                  type="range"
                  min="0"
                  max="100"
                  value={comparison}
                  onChange={(event) => setComparison(Number(event.target.value))}
                  className="comparison-slider mt-5 w-full"
                />
              </>
            ) : (
              <div className="relative aspect-square overflow-hidden rounded-[1.4rem] bg-black">
                <img src={uploadedImage} alt="User-uploaded Mars image preview" className="h-full w-full object-contain" />
                <div className="absolute inset-x-4 bottom-4 border border-white/15 bg-black/65 p-4 text-white backdrop-blur-sm">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#EAC59E]">Staged plate</p>
                  <p className="mt-1 text-sm leading-5 text-white/85">The browser has preserved your raw image. Run the Python detector to create a validated annotated output for this plate.</p>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">OpenCV workflow · saved analysis</p>
              <button onClick={() => setShowOverlay((current) => !current)} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-white transition-colors hover:bg-white/10">
                <Layers3 className="size-3.5" /> {showOverlay ? "Hide output" : "Show output"}
              </button>
            </div>
          </article>

          <aside className="flex flex-col rounded-[2rem] border border-[#CFC0AD] bg-[#F7F1E7] p-6 shadow-[0_14px_36px_rgba(58,43,28,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#9A3E28]">Instrument settings</p>
                <h3 className="mt-2 font-display text-3xl tracking-[-0.055em]">Readout profile</h3>
              </div>
              <SlidersHorizontal className="mt-1 size-5 text-[#C84A2C]" />
            </div>
            <p className="mt-3 text-sm leading-6 text-[#6B5E52]">Study the settings used for this saved pass. Move the values to explore the parameter logic; the verified sample itself is not recomputed in-browser.</p>

            <div className="mt-7 space-y-6">
              <label className="block">
                <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[#5F554C]"><span>Canny low</span><span>{cannyLow}</span></div>
                <input type="range" min="10" max="100" value={cannyLow} onChange={(event) => setCannyLow(Number(event.target.value))} className="signal-range signal-range-red w-full" />
              </label>
              <label className="block">
                <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[#5F554C]"><span>Canny high</span><span>{cannyHigh}</span></div>
                <input type="range" min="80" max="240" value={cannyHigh} onChange={(event) => setCannyHigh(Number(event.target.value))} className="signal-range signal-range-red w-full" />
              </label>
              <label className="block">
                <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-[#5F554C]"><span>Circle evidence</span><span>{circleEvidence}</span></div>
                <input type="range" min="22" max="80" value={circleEvidence} onChange={(event) => setCircleEvidence(Number(event.target.value))} className="signal-range signal-range-green w-full" />
              </label>
            </div>

            <div className="mt-8 border-t border-[#D8CCBA] pt-5">
              <div className="flex items-center gap-2 text-sm text-[#433B34]"><Check className="size-4 text-[#5E9A53]" /> Conservative circle threshold</div>
              <div className="mt-3 flex items-center gap-2 text-sm text-[#433B34]"><Check className="size-4 text-[#C84A2C]" /> RGB image with grayscale analysis</div>
            </div>
            <div className="mt-auto pt-8">
              <input ref={uploadRef} onChange={handleUpload} accept="image/*" type="file" className="hidden" />
              <Button onClick={() => uploadRef.current?.click()} variant="outline" className="h-11 w-full rounded-full border-[#BFB1A0] bg-transparent text-sm hover:bg-[#EDE2D2]"><FileImage className="mr-2 size-4" /> Stage a different image</Button>
              {uploadedImage && <button onClick={useVerifiedPass} className="mt-3 w-full text-center font-mono text-[10px] uppercase tracking-[0.14em] text-[#9A3E28] hover:underline">Return to verified pass</button>}
            </div>
          </aside>
        </div>
      </section>

      <section id="method" className="border-y border-[#D4C7B5] bg-[#DDD1BE]/55">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[.88fr_1.12fr] lg:px-12 lg:py-20">
          <div className="relative min-h-[330px] overflow-hidden rounded-[1.6rem] border border-[#BDAE9C] bg-[#49372C]">
            <img src={assets.fieldPlate} alt="Detailed Mars field plate of rocks and dusty soil" className="absolute inset-0 h-full w-full object-cover opacity-85 mix-blend-luminosity" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#241A15] via-[#513A2A]/20 to-transparent" />
            <div className="absolute inset-x-6 bottom-6 text-[#F7F1E7]">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#EAC59E]">Field note · interpretation</p>
              <p className="mt-3 max-w-md font-display text-3xl leading-[0.95] tracking-[-0.06em]">Candidate circles are signals to inspect, not confirmed craters.</p>
            </div>
          </div>
          <div className="self-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9A3E28]">Method, kept honest</p>
            <h2 className="mt-3 font-display text-4xl leading-none tracking-[-0.06em] sm:text-5xl">Two passes. One careful reading.</h2>
            <div className="mt-9 grid gap-5 sm:grid-cols-2">
              <div className="border-t-2 border-[#C84A2C] pt-4">
                <div className="flex items-center gap-3"><ScanLine className="size-5 text-[#C84A2C]" /><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7B4030]">01 · Canny</p></div>
                <p className="mt-3 text-sm leading-6 text-[#5D5147]">Highlights high-contrast boundaries that may trace rocks, terrain breaks, equipment edges, and shadow transitions.</p>
              </div>
              <div className="border-t-2 border-[#5E9A53] pt-4">
                <div className="flex items-center gap-3"><CircleDotDashed className="size-5 text-[#5E9A53]" /><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#456B3C]">02 · Hough</p></div>
                <p className="mt-3 text-sm leading-6 text-[#5D5147]">Proposes approximately circular structures. Rock outlines, shadows, and imaging artifacts can still produce false positives.</p>
              </div>
            </div>
            <a href="#evidence" className="mt-9 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-[#9A3E28] transition-all hover:gap-3">Read the evidence notes <ArrowUpRight className="size-3.5" /></a>
          </div>
        </div>
      </section>

      <section id="evidence" className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 lg:px-12 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_.82fr] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#9A3E28]">Evidence ledger</p>
            <h2 className="mt-3 max-w-3xl font-display text-5xl leading-[0.94] tracking-[-0.065em] sm:text-6xl">The analysis is useful because its limits are visible.</h2>
          </div>
          <div className="rounded-[1.6rem] border border-[#CFC0AD] bg-[#F7F1E7]/80 p-6">
            <Sparkles className="size-5 text-[#C84A2C]" />
            <p className="mt-4 text-sm leading-6 text-[#5C5148]">This site preserves the original source image next to the actual annotated result, so the visual evidence is always available for comparison.</p>
          </div>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="border border-[#D5C9B8] bg-[#F7F1E7]/65 p-6"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9A3E28]">Overlay convention</p><h3 className="mt-4 font-display text-2xl tracking-[-0.05em]">Color carries meaning.</h3><p className="mt-3 text-sm leading-6 text-[#665A50]">Oxide red is reserved for edge response. Signal green marks candidate circles; blue indicates centers.</p></article>
          <article className="border border-[#D5C9B8] bg-[#F7F1E7]/65 p-6"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9A3E28]">Run record</p><h3 className="mt-4 font-display text-2xl tracking-[-0.05em]">Parameters stay attached.</h3><p className="mt-3 text-sm leading-6 text-[#665A50]">The saved Curiosity pass records Canny thresholds of 50 and 150 with circle evidence set to 50.</p></article>
          <article className="border border-[#D5C9B8] bg-[#F7F1E7]/65 p-6"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9A3E28]">Next inspection</p><h3 className="mt-4 font-display text-2xl tracking-[-0.05em]">Inspect before claiming.</h3><p className="mt-3 text-sm leading-6 text-[#665A50]">Use candidates to focus human attention, then verify them against terrain structure and mission context.</p></article>
        </div>
      </section>

      <footer className="border-t border-[#CFC0AD] bg-[#29241F] text-[#F7F1E7]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-10 sm:px-8 md:flex-row md:items-end md:justify-between lg:px-12">
          <div className="flex max-w-lg items-start gap-4">
            <img src={assets.mark} alt="" className="mt-0.5 size-10 object-contain" />
            <div><p className="font-display text-2xl tracking-[-0.055em]">Terrain Signal</p><p className="mt-2 text-sm leading-6 text-white/60">A visual field desk for turning raw Mars imagery into inspectable computer-vision evidence.</p></div>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50">Curiosity sample · Canny + Hough workflow</div>
        </div>
      </footer>
    </main>
  );
}
