# MARSBOUND — Design Directions

## Three Directions Considered

### 1. Mission Documentary Interface
**Very Brief Intro:** A cinematic near-black mission console that uses large Mars imagery, restrained red status signals, white technical typography, and deliberate information pacing. It translates NASA-like editorial authority into an original landing-safety product rather than copying a government website.

**Probability:** 0.018

### 2. Surface Survey Instrument
**Very Brief Intro:** A close-range terrain workstation built around image plates, geological measurement overlays, and rugged field materials. It emphasizes local hazard inspection over the larger mission narrative.

**Probability:** 0.064

### 3. Orbital Descent Archive
**Very Brief Intro:** An archival aerospace system with dense coordinate grids, long-form telemetry, and satellite-image frames. It makes the scoring engine feel like a documentable planning artifact.

**Probability:** 0.037

---

## Chosen Direction: Mission Documentary Interface

### Design Movement
**Aerospace mission control meets cinematic space documentary.** This is an original MARSBOUND control room—not a NASA site clone—with a dark exhibition-like atmosphere that gives terrain imagery, status readouts, and the landing decision equal authority.

### Core Principles
1. **The landing recommendation is the visual climax.** Visitors should immediately see where to land, its risk score, and why it earned the rank.
2. **Workflow, not widgets.** The interface should progress visibly from image acquisition to hazard detection, risk generation, ranking, and report.
3. **Cinematic evidence, restrained controls.** Large photography and sharp technical panels coexist without sliding into cyberpunk or generic SaaS patterns.
4. **Explainability is part of safety.** Every recommendation exposes its supporting evidence, scoring signals, and uncertainty.

### Color Philosophy
Near-black and charcoal create the feeling of a dark mission-control room, giving off-white typography strong contrast. Mars red acts as a selective mission/status accent. Green, amber, and red only appear for safety state, risk level, and active results; they never become decorative gradients.

### Layout Paradigm
The site begins as a full-bleed mission briefing, then folds into a **descent workflow**: acquisition on the left, diagnostic sequence in the middle, analysis evidence and recommendation on the right. Content scales from wide cinematic panels to stacked mobile mission cards without becoming a generic dashboard grid.

### Signature Elements
1. **Mission strips:** compact uppercase metadata like `MB-LSIS // MISSION CONTROL`, image identifiers, coordinate ticks, and live-state lamps.
2. **Sight-line overlays:** thin crosshairs, cropped grid lines, and scanner passes applied sparingly to image plates.
3. **Descent signal:** a distinctive red horizon arc and landing-reticle mark repeated in the logo, primary CTA, and selected safe zone.

### Interaction Philosophy
Buttons advance an understandable mission state: load terrain, run analysis, review modes, inspect zones, export the report, or reset. The demo uses verified saved detector results; an uploaded image is clearly identified as staged until a future OpenCV API completes it.

### Animation
The hero terrain plate drifts minimally on load. Acquisition and processing use 180–300 ms opacity and translate transitions, with a narrow scanner line during analysis. Hazard and grid layers reveal in a short sequence before the recommended zone receives one restrained pulse. All non-essential animation is disabled under `prefers-reduced-motion`.

### Typography System
**Space Grotesk** provides clear technical and interface hierarchy; **IBM Plex Mono** provides telemetry, labels, score tables, and instrument details. Editorial scale comes from wide weight contrast and unusually generous headline spacing, not from decorative fonts.

### Brand Essence
**MARSBOUND is an autonomous landing-site intelligence system that turns Mars terrain imagery into an explainable, mission-ready safety decision.**

**Personality:** authoritative, lucid, disciplined.

### Brand Voice
Copy is clear, tense, and operational. It should describe a specific system state or mission decision—not use startup slogans.

Example lines:

> Find the safest ground before touchdown.

> Recommendation ready. Review the terrain evidence before committing descent.

### Wordmark & Logo
The MARSBOUND mark is a **minimal descent arc crossing a centered landing reticle**, rendered in mission red and off-white. The wordmark uses a tight uppercase technical sans with a small `//` separator and the subtitle set in mono.

### Signature Brand Color
**Descent Red** — `#E13C2E` — is the exclusive mission-critical accent.

## Style Decisions

- Preserve visual credibility by labeling the current Curiosity result as a verified sample and raw user uploads as staged until a real backend analysis is connected.
- Use MARSBOUND’s own wordmark, mark, and telemetry language; draw inspiration from aerospace editorial design without reproducing NASA branding or layouts.
- The entry screen is a restrained mission briefing, not a marketing hero: reduce headline scale, remove decorative recommendation teasers, and route the visitor directly to terrain acquisition.
- The terrain plate is the primary interface surface. Derived evidence must appear as contiguous viewing modes—raw terrain, edges, circular features, combined hazards, and risk grid—rather than as detached promotional cards.
- Mission decision language is compact and specific. Favor tables, coordinate labels, hazard counts, and inspectable reasons over floating badges, glass effects, or ornamental UI.
- The first viewport must expose the current landing recommendation, risk score, and primary rationale as the active mission outcome; it must not wait for the lower decision section.
- Descent Red `#E13C2E` remains the sole brand accent. Green is reserved for confirmed safe or recommended states, amber for caution, and intermediate detector layers use restrained instrument tones unless they directly encode risk.
- Every section must reinforce one descent sequence: acquisition → processing → evidence → label inspection → ranked decision. Repeat short mission-state language and the reticle/grid motif to connect these stages.
- The recommendation panel is the official mission output. It should visually carry the descent reticle and retain enough contrast to feel like the final commit-or-review artifact.
