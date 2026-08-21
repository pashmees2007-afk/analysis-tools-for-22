# Analysis Tools for 22: Simple Judge Guide

This guide explains the analysis part of the project in plain English. You can use the short scripts directly, then use the later sections if a judge asks more technical questions.

## The One-Minute Explanation

> “Our system reviews a Mars terrain image in two different ways. First, our trained model gives a pixel-by-pixel terrain prediction: soil, bedrock, sand, or big rock. Second, our computer-vision tool finds visually complex areas by measuring edges, texture, and contrast. We keep those two outputs separate, because they answer different questions.
>
> The model helps us see its terrain-class prediction. The computer-vision tool helps a human decide where to look more carefully. Neither tool says that an area is safe, dangerous, or suitable for landing. We also added a Mars-source gate: if an image is not a verified Mars image, we do not run the Mars-trained model. Instead, we can show only the generic visual-complexity evidence.”

## What Problem Are We Solving?

Mars terrain images can be large and detailed. A human reviewer may want help finding rocky, textured, high-contrast, or visually unusual parts of an image. This project does not replace the human reviewer. It creates two transparent evidence layers that help the reviewer inspect the image faster.

> **Important sentence to remember:** “We are supporting human review, not making an autonomous safety decision.”

## The Full Flow, From Start to End

```text
1. User selects or uploads an image
        ↓
2. Mars-source gate checks whether the trained Mars model is allowed
        ↓
3. If verified Mars: run the trained terrain model
        ↓
4. For all allowed images: run visual-complexity analysis
        ↓
5. Return overlays, class coverage, and the top three review areas
        ↓
6. Frontend shows the image and evidence to the human reviewer
```

The backend sends the image as bytes to one function: `analyzeTerrain()`. That function returns two separate result blocks: `model` and `visualComplexity`. The frontend displays them; the backend handles uploads, storage, and any database records.

| Team part | What it does |
|---|---|
| Your analysis package | Runs the model, visual-complexity calculations, source gate, and produces result files. |
| Backend | Receives images, enforces the gate, calls the analysis package, and stores or returns results. |
| Frontend | Lets the user choose/upload an image and shows the returned masks, overlays, warnings, and review cells. |

## Tool 1: The Trained Terrain Model

### What the model does

The trained model looks at every pixel in a Mars image and assigns one of four terrain labels:

| Model label | Plain-English meaning |
|---|---|
| Soil | Fine, ordinary ground-like terrain according to the model’s training labels. |
| Bedrock | More solid, exposed rock-like terrain according to the model’s training labels. |
| Sand | Sand-like terrain according to the model’s training labels. |
| Big rock | Larger rock-like terrain according to the model’s training labels. |

The result is a **segmentation mask**. A segmentation mask is simply a colour image where each colour represents the model’s predicted class for one pixel. We also blend that mask on top of the source image, so a reviewer can compare the prediction to the real image.

### Model specifications

| Item | Specification |
|---|---|
| Model name | `ai4mars-msl-mobilenetv3-unet-v1` |
| Architecture | MobileNetV3-Small encoder with a U-Net-style decoder |
| Runtime format | ONNX model plus external tensor-data file |
| Inference runtime | ONNX Runtime on CPU |
| Input | RGB image resized to 256 × 256 pixels and normalized with ImageNet channel statistics |
| Output | One predicted class per pixel, then a mask and overlay |
| Classes | Soil, bedrock, sand, big rock |

### What “MobileNetV3–U-Net” means

You do not need to memorize every internal detail. Say this:

> “MobileNetV3 is the efficient visual feature extractor. The U-Net-style part turns those visual features back into a full pixel-by-pixel terrain map.”

In simpler terms, the first part learns useful patterns such as shapes, boundaries, and textures. The second part turns those patterns into a label map with the same layout as the image.

### Training and evaluation data

The model was evaluated using a fixed AI4Mars Mars Science Laboratory image split. The evaluation record uses 2,500 matched rover-image and terrain-mask pairs: 1,900 for training, 300 for validation, and 300 held-out test images. AI4Mars is a NASA dataset for terrain-aware autonomous-driving research. [1]

| Evaluation measure | Held-out test result | What it means in simple English |
|---|---:|---|
| Pixel accuracy | 82.02% | About 82 out of 100 test pixels matched the reference label. |
| Macro F1 | 81.75% | A balanced overall score across the four terrain classes. |
| Soil F1 | 83.11% | Performance for the soil class on the held-out test split. |
| Bedrock F1 | 83.26% | Performance for the bedrock class on the held-out test split. |
| Sand F1 | 78.49% | Performance for the sand class on the held-out test split. |
| Big-rock F1 | 82.15% | Performance for the big-rock class on the held-out test split. |

### How to explain accuracy safely

> “The 82.02% pixel accuracy and 81.75% macro F1 are results on the fixed held-out AI4Mars test split. They are not a promise that every label on a new judge-uploaded image is correct.”

**Pixel accuracy** asks: “How many individual pixels matched the test reference?” **F1** balances two kinds of error: missing a class and falsely predicting a class. **Macro F1** gives each class equal importance, so strong soil performance cannot hide weak sand or big-rock performance.

## Tool 2: TERRAIN LENS Visual-Complexity Analysis

### What it does

This second tool does **not** use learned model weights. It uses traditional computer-vision measurements calculated directly from the image pixels. It looks for areas with more visible structure, such as rough texture, strong boundaries, and large brightness changes.

> “The CV tool does not say what the terrain is. It says where the image looks visually more complex and deserves closer human review.”

### The three measurements

| Measurement | Basic meaning | Why it is useful |
|---|---|---|
| Edge density | How many strong local boundaries appear in an area | Rocks, cracks, ridges, and abrupt changes can create more edges. |
| Texture variance | How quickly nearby brightness values change | Rough or detailed surfaces can have more texture. |
| Contrast | How different dark and bright pixels are in one area | Shadows, slopes, and sharp features can create more contrast. |

The code converts the image to grayscale for these measurements. It calculates an edge map from local image gradients, a Laplacian-style texture measurement, and local grayscale contrast. This is a deterministic process: the same input image produces the same result.

### Grid scoring

The image is split into a **6 × 4 grid**, meaning 24 cells. Every cell receives a score relative to the other cells in the same image:

```text
visual complexity score
  = 40% edge density
  + 35% texture variance
  + 25% contrast
```

The system ranks all 24 cells and highlights the top three. Red means the top-ranked review cell, then orange and yellow for the next two. These colours mean **“look here first”**, not “this is dangerous.”

### What the CV tool returns

| Output | What a reviewer sees |
|---|---|
| Edge map | Bright areas show stronger local boundaries. |
| Texture map | Bright areas show more local texture response. |
| Complexity overlay | Top three review cells drawn on the original image. |
| Ranked cells | Cell positions, scores, and their three component measurements. |

## Why We Use Both Tools

The trained model and CV tool are intentionally separate.

| Question | Best tool | Why |
|---|---|---|
| “What terrain class does the model predict here?” | Trained terrain model | It produces soil, bedrock, sand, and big-rock labels. |
| “Where does this image look most detailed or irregular?” | Visual-complexity tool | It measures edges, texture, and contrast directly. |
| “Is this area safe for landing?” | Neither tool alone | Real safety also needs slope, vehicle design, trajectory, communications, lighting, thermal limits, and engineering review. |

## Mars-Only Source Gate

The trained model is Mars-specific. A Moon image can still be processed by the computer, but the Mars model would force it into Mars labels and produce a misleading answer. We therefore added a gate before model inference.

| Gate result | Meaning | Mars model | CV tool |
|---|---|---|---|
| `accepted` | Image is declared as Mars, uses an approved Mars source, and its bytes match the approved backend copy. | Runs | Runs |
| `unknown` | Mars was declared, but the backend cannot verify the source bytes. | Skips | May run as generic image analysis |
| `blocked` | Image is declared as Moon, Earth, or another target. | Skips | May run as generic image analysis |

The core protection is an exact SHA-256 file-hash comparison. In simple language: the backend compares the uploaded file’s digital fingerprint with the approved source image’s fingerprint. If they do not match exactly, the Mars model is withheld.

### Why this matters

We tested a tricky case: a real lunar image was falsely labelled “Mars” and given a real NASA Mars URL. A simple URL-only gate could be fooled. The hardened gate detected that the lunar file bytes did not match the approved Mars file, so it skipped the Mars model.

> “We do not force every planetary image into Mars terrain labels. The system knows when to withhold the Mars model.”

## What We Tested

| Test | Result |
|---|---|
| Single real Mars terrain dry run | Both model and visual-complexity outputs were generated successfully. |
| Two-image Mars batch run | Both images completed with model masks, overlays, edge maps, texture maps, and ranked review cells. |
| Lunar-image model dry run | Demonstrated why Mars-only gating is necessary: the Mars model still produced Mars labels for Moon terrain. |
| Hardened source-gate checks | Verified Mars image allowed; forged lunar metadata, altered Mars bytes, and honest Moon declaration withheld the Mars model. |

## Honest Limitations

Say these clearly. They make the project more credible.

1. **This is not a landing-safety system.** It does not calculate slope, vehicle dynamics, trajectory, communication constraints, thermal conditions, or full uncertainty.
2. **The model predicts classes; it does not prove ground truth.** The model may make mistakes, especially on new sensors, lighting, dust, compression, scale, or terrain outside its evaluation data.
3. **The visual-complexity tool finds image complexity only.** It does not prove that a highlighted area is dangerous or safe.
4. **The Mars gate is a provenance check, not a planet-recognition AI.** It verifies approved source files. An arbitrary image upload is intentionally treated as unverified.
5. **Exact source matching is strict.** A crop, screenshot, or edited version of an approved image will be marked `unknown` unless the backend made the crop itself or the derivative was explicitly approved.

## Judge Questions and Simple Answers

### “Why did you use a model and computer vision together?”

> “They give different evidence. The model predicts terrain classes; CV highlights visually complex regions. Showing both makes the output easier to inspect rather than relying on one black box.”

### “Why is the model Mars-only?”

> “Its training labels and evaluation are Mars-specific. We chose to restrict it rather than pretend it works on every planet. For non-Mars images, we withhold the model and can still show generic visual-complexity evidence.”

### “What does 82% accuracy mean?”

> “It is held-out pixel accuracy on the AI4Mars test split. It is a useful benchmark, but not a guarantee for every new image.”

### “Does red mean danger?”

> “No. Red only means the highest visual-complexity score in that image. It tells the reviewer where to inspect first.”

### “What happens if I upload a screenshot?”

> “The source is unverified, so the Mars model is withheld. We show a clear message and can still provide generic CV analysis.”

### “What is the best next step?”

> “Use more labelled Mars images, validate across additional imaging conditions, add a controlled approved-image library, and combine the results with other mission variables such as slope and vehicle constraints.”

## Your Role: One Clear Closing Statement

> “My part was the analysis layer. I created the combined pipeline: a trained Mars terrain segmentation model, a transparent visual-complexity tool, batch and real-image dry runs, and the Mars-only source verification gate. The backend connects this pipeline to the product, and the frontend presents its evidence clearly to the reviewer.”

## References

[1] [NASA Open Data Portal, *AI4MARS: A Dataset for Terrain-Aware Autonomous Driving on Mars*](https://data.nasa.gov/dataset/ai4mars-a-dataset-for-terrain-aware-autonomous-driving-on-mars)
