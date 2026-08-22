# MARSBOUND: 2,500-Pair Dataset Optimization Plan

**Purpose.** This plan describes how to use the existing 2,500 matched AI4Mars MSL image-and-label pairs more effectively before expanding the dataset again. Its objective is to move MARSBOUND toward **60% pixel accuracy**, **50%+ macro F1**, and **45–50%+ F1 for both sand and big rock**, without hiding rare-hazard mistakes behind easy soil pixels.

> **Important:** No dataset or training change can guarantee 60% accuracy. The correct engineering approach is to keep one strict test set untouched, improve the training pipeline, and promote a new model only when it demonstrates the target on unseen terrain images.

## 1. Where MARSBOUND stands today

**Outcome update — 19 August 2026.** The planned MobileNetV3-U-Net experiment completed and passed the strict promotion gate. The live model is now `ai4mars-msl-mobilenetv3-unet-v1`, which achieved 82.02% pixel accuracy and 81.75% macro F1 on the fixed 300-image held-out split. The table below preserves the previous v3 numbers as the historical benchmark that the promotion had to exceed.

| Metric | Historical v3 | Promoted MobileNetV3-U-Net | Why it matters |
|---|---:|---:|---|
| Pixel accuracy | 35.92% | **82.02%** | Overall exact terrain-pixel matches |
| Macro F1 | 33.16% | **81.75%** | Treats all four terrain classes fairly |
| Soil F1 | 45.34% | **83.11%** | Common terrain class |
| Bedrock F1 | 23.89% | **83.26%** | Main historical confusion source |
| Sand F1 | 28.90% | **78.49%** | Landing-surface relevance |
| Big-rock F1 | 34.51% | **82.15%** | Safety-critical obstacle evidence |

The retired baseline remains useful as an archived explainability reference, but its handcrafted features could not reliably separate terrain categories with similar brightness, shadows, and texture. The promoted neural model materially improves the fixed-split scores; its separate evaluation and deployment limitations are recorded in `semantic_model_evaluation.md`. Mars terrain still has small inter-class visual differences, strong scale changes, and pronounced class imbalance; the big-rock class can be particularly scarce. [2]

## 2. Do not add random images first

The next gain should come from **better use of the existing 2,500 pairs**, not from simply collecting another random batch. AI4Mars is built for terrain-model training and validation, and includes both crowdsourced labels and a smaller expert-labelled validation resource. [1] The first step is to curate the 2,500 pairs into useful, non-leaking learning groups.

| Data action | Exact rule | Benefit |
|---|---|---|
| Keep a frozen test set | Reserve 300 images and never use them for model choices or tuning | Makes the final score believable |
| Split by image sequence, not only filename | Group near-duplicate frames from the same rover drive/scene before assigning train, validation, or test | Prevents the model from seeing nearly the same terrain in training and testing |
| Preserve rare hazards in evaluation | Keep at least 60–80 sand images and 60–80 big-rock images in both validation and test | Ensures model selection measures the hazards judges care about |
| Create a “hard example” pool | Tag images or patches with shadows, bright glare, soil–bedrock borders, distant rocks, and low label coverage | Focuses training on the confusions now lowering F1 |
| Protect unknown pixels | Leave label value `255` ignored during loss and metric calculations; never convert it to soil | Avoids false accuracy from unlabelled terrain |
| Review label quality | Manually inspect a small, representative rare-hazard set before training: 50 big-rock, 50 sand, and 50 difficult borders | Stops noisy or ambiguous masks from becoming the model’s main lesson |

## 3. Change the training sample mix

Training on full frames alone lets the enormous soil background dominate learning. The solution is **context-preserving patch sampling**: show the model ordinary full-scene terrain and deliberately show it more patches centred on rare or confusing regions.

| Suggested mini-batch mix | What is sampled | Why |
|---:|---|---|
| 35% | Random terrain patches from all training images | Retains real-world class proportions and scene context |
| 25% | Big-rock-centred patches, with surrounding terrain | Improves obstacle boundaries and recall |
| 20% | Sand-centred patches, with surrounding terrain | Improves safer-surface recognition |
| 10% | Soil–bedrock boundary patches | Directly targets the current bedrock confusion |
| 10% | Shadow, glare, low-contrast, and highly textured patches | Makes the model less dependent on lighting |

Use 384–512 pixel crops during training, with multi-scale resizing. Small 128-pixel crops can remove the context needed to tell a rock from a shadow or a bedrock shelf from soil. Preserve the full image’s aspect and use overlap where a big rock touches another class.

## 4. Use Mars-realistic augmentation

Augmentation should simulate the camera and lighting changes Mars images genuinely have. It must not invent impossible geometry.

| Use | Avoid |
|---|---|
| Moderate brightness, contrast, gamma, and local-shadow shifts | Vertical flips, which can destroy rover-camera perspective |
| Small rotations and horizontal flips when camera orientation is not a semantic label | Heavy blur that erases rock edges |
| Mild Gaussian noise and JPEG compression | Extreme colour shifts that no rover camera would produce |
| Random scale crops with intact masks | Crops that remove all context around rare rocks |

## 5. Replace the feature prototype with a pretrained segmentation network

The most valuable model change is an **encoder–decoder segmentation network with a pretrained visual encoder**. A practical first candidate is **MobileNetV3 or ResNet-34 encoder + U-Net or DeepLabV3+ decoder**. The pretrained encoder begins with general edge, texture, shape, and local-context understanding rather than learning all of those concepts from 1,900 training images.

This is a justified next experiment, not a claim that it will automatically win. Mars-specific work has shown that encoder–decoder networks, multi-scale context, and lightweight visual backbones can achieve strong segmentation results, while also emphasizing that results depend on dataset, labels, and evaluation protocol. [2] [3]

| Training setting | Recommended starting point | Reason |
|---|---|---|
| Input | Native RGB if available; otherwise repeat grayscale across three channels and retain contrast | Lets an ImageNet-pretrained encoder be used without discarding available colour information |
| Resolution | 512 pixels for main training; validate at the same resolution | Preserves small rocks and terrain boundaries |
| Loss | Weighted cross-entropy + Dice loss; tune class weights on validation only | Balances pixels while rewarding region overlap |
| Rare-hazard handling | Oversampled patch sampler, not extreme loss weights alone | Reduces rare-class misses without destabilising all classes |
| Optimizer | AdamW with cosine learning-rate decay and early stopping on validation macro F1 | A stable, reproducible starting configuration |
| Model selection | One validation leaderboard; one untouched final test | Prevents accidental test-set tuning |

## 6. Promotion gate: what must improve

The next candidate should **not** replace v3 merely because a single overall number rises. MARSBOUND exists to support landing intelligence, so dangerous rare-class regressions matter.

| Required held-out test result | Promotion rule |
|---|---|
| Pixel accuracy | Target 60% or a clearly material improvement over v3 |
| Macro F1 | Target 50%+ and higher than v3 |
| Sand F1 | At least v3’s 28.90%; target 45–50%+ |
| Big-rock F1 | At least v3’s 34.51%; target 45–50%+ |
| Per-image review | No systematic failure on shadowed scenes, rock boundaries, or novel-looking terrain |
| Decision transparency | Keep source, prediction, label, disagreement, and metrics visible in MARSBOUND |

The prior v4 experiment is a useful warning: it raised macro F1 slightly but reduced both rare-hazard F1 scores, so it was correctly not promoted. The same strict rule should apply to the pretrained network.

## 7. Recommended execution order

| Priority | Work item | Evidence of success |
|---:|---|---|
| 1 | Audit sequence leakage, label coverage, rare-class presence, and hard examples in the current 2,500 pairs | A frozen split manifest with per-image metadata |
| 2 | Build the context-preserving rare-hazard patch sampler and Mars-realistic augmentation | Training batches visibly include each target category |
| 3 | Train a MobileNetV3-U-Net baseline at 512 pixels with weighted CE + Dice | Validation macro F1 exceeds v3 before test evaluation |
| 4 | Tune only learning rate, crop mix, and class weights on validation data | Sand and big-rock F1 improve without unstable loss |
| 5 | Run the untouched 300-image test once | Promotion decision backed by common held-out metrics |
| 6 | Integrate only a passing model and re-run upload-flow tests | MARSBOUND stays reliable and evidence-first |

## References

[1] [NASA Open Data Portal, *AI4MARS: A Dataset for Terrain-Aware Autonomous Driving on Mars*](https://data.nasa.gov/dataset/ai4mars-a-dataset-for-terrain-aware-autonomous-driving-on-mars)

[2] [Li et al., *MarsSeg: Mars Surface Semantic Segmentation with Multi-level Extractor and Connector*](https://arxiv.org/html/2404.04155)

[3] [Dai et al., *SegMarsViT: Lightweight Mars Terrain Segmentation Network for Autonomous Driving in Planetary Exploration*](https://www.mdpi.com/2072-4292/14/24/6297)
