# MARSBOUND Semantic Terrain Model Evaluation

**Status: promoted on 19 August 2026.** MARSBOUND now serves `ai4mars-msl-mobilenetv3-unet-v1`, a MobileNetV3-Small encoder with a U-Net-style decoder. The promotion follows the project’s pre-declared gate: a candidate had to improve overall macro F1 **and** preserve or improve sand and big-rock F1 on the same untouched test images.

> **Scope of this result.** Every score below is measured on the fixed 300-image AI4Mars MSL test partition. It is not an accuracy estimate for a particular new upload, a landing zone, or an operating rover.

## Dataset and evaluation protocol

The experiment used 2,500 directly matched MSL rover-image and terrain-mask pairs retrieved from the AI4Mars merged archive. The image-level manifest retains 1,900 images for training, 300 for checkpoint selection, and 300 untouched images for the one-time promotion decision. Label value `255` remains excluded from both loss and scores so unannotated terrain cannot inflate results. AI4Mars is a terrain-label dataset intended for Mars autonomous-driving research.[1]

| Partition | Images | Permitted use |
|---|---:|---|
| Training | 1,900 | Fit model parameters and rare-hazard-aware samples |
| Validation | 300 | Select the checkpoint by macro F1 only |
| Test | 300 | One final comparison with active v3; never used for checkpoint selection |

## Candidate configuration

The model accepts RGB terrain at **256 × 256 pixels**, normalized with ImageNet channel mean `[0.485, 0.456, 0.406]` and standard deviation `[0.229, 0.224, 0.225]`. It uses an ImageNet-pretrained MobileNetV3-Small encoder and U-Net-style decoder. Training used 14 epochs, batch size 8, a weighted cross-entropy loss (65%) plus Dice loss (35%), and an image sampler/crop policy that favored big rock, sand, and bedrock while retaining ordinary terrain context. The selected epoch was **epoch 11**, chosen solely by the validation macro F1 of **77.37%**.

| Training safeguard | Implementation |
|---|---|
| Rare-hazard exposure | Crop target weights: big rock 4.0, sand 3.0, bedrock 1.5, soil 1.0 |
| Label handling | Unknown/unlabelled pixels are ignored (`255`) |
| Terrain variation | Moderate illumination shift, sensor noise, and horizontal flips only |
| Checkpoint selection | Highest validation macro F1; the test partition was not consulted |
| Runtime model | ONNX opset 18 executed on CPU through `onnxruntime-node` |

## Held-out promotion decision

The neural candidate passes every part of the promotion rule. Most importantly for landing-site intelligence, the rare-hazard scores for both **sand** and **big rock** are substantially stronger than the v3 model they replace.

| Metric | Retired v3 prototype | MobileNetV3-U-Net v1 | Change | Promotion condition |
|---|---:|---:|---:|---|
| Pixel accuracy | 35.93% | **82.02%** | +46.09 pp | Material improvement |
| Macro F1 | 33.16% | **81.75%** | +48.59 pp | Must improve |
| Soil F1 | 45.34% | **83.11%** | +37.77 pp | Informational |
| Bedrock F1 | 23.89% | **83.26%** | +59.37 pp | Informational |
| Sand F1 | 28.90% | **78.49%** | +49.60 pp | Must not decline |
| Big-rock F1 | 34.51% | **82.15%** | +47.64 pp | Must not decline |

The promotion therefore replaces the previous nearest-prototype implementation in the server, rather than merely displaying an offline experiment result. The frontend preserves the old three-sample prototype comparison as an explicitly labelled **archived error-evidence plate**; it does not relabel those legacy images as new-model results.

## Deployment contract

The server converts an accepted PNG, JPEG, or WebP upload into a rotation-corrected 256 × 256 RGB image, normalizes it exactly as during evaluation, executes the exported ONNX model, and returns an AI4Mars class map for soil, bedrock, sand, and big rock. It then renders both a colorized mask and an additive evidence overlay, persists those artifacts in storage, and records the analysis result. The model artifact is copied into the production server build with its ONNX external-weight file.

| Artifact | Purpose |
|---|---|
| `ai4mars_training/corpus_2500/mobilenetv3_unet_v1/best.pt` | Selected PyTorch checkpoint |
| `ai4mars_training/corpus_2500/mobilenetv3_unet_v1/evaluation.json` | Fixed-split candidate-versus-v3 measurements |
| `server/models/mobilenetv3_unet_v1.onnx` and `.onnx.data` | Production inference artifact and external weights |
| `server/segmentationModel.ts` | ONNX input normalization, session reuse, and argmax class decoding |
| `server/segmentation.ts` | Upload preprocessing, visualization, storage persistence, and disclosure text |

## Limitations and responsible interpretation

The improved score does **not** make this a flight-qualified landing-clearance system. The model has been evaluated on the fixed AI4Mars MSL split, where image styles, rover context, and annotation practices may differ from a novel mission camera, elevation, lighting, dust, or image-compression conditions. Semantic classes also represent terrain pixels, not a complete descent-risk model: slope, thermal constraints, vehicle dynamics, trajectory, communications, and uncertainty calibration require independent engineering assessment. MARSBOUND therefore labels every new result as research decision-support evidence and retains the source image and visual output for inspection.

## References

[1] [NASA Open Data Portal, *AI4MARS: A Dataset for Terrain-Aware Autonomous Driving on Mars*](https://data.nasa.gov/dataset/ai4mars-a-dataset-for-terrain-aware-autonomous-driving-on-mars)

