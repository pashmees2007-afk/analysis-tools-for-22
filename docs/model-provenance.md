# Model Provenance and Scope

## Imported Model Path

The model path in this repository uses `ai4mars-msl-mobilenetv3-unet-v1`, a MobileNetV3-Small encoder with a U-Net-style decoder. Its exported inference artifact consists of two required files: `src/models/mobilenetv3_unet_v1.onnx` and its external tensor-data companion `src/models/mobilenetv3_unet_v1.onnx.data`.

The source evaluation record describes a 2,500-image AI4Mars MSL corpus split into 1,900 training images, 300 validation images, and 300 held-out test images. It reports a 256-by-256 RGB input contract with ImageNet normalization and CPU inference through ONNX Runtime. The source dataset is described by NASA as terrain-label data for Mars autonomous-driving research. [1]

## Integration Contract

The package preserves the model’s 256-by-256 RGB preprocessing, channel normalization, reusable ONNX Runtime session, and four decoded class labels: soil, bedrock, sand, and big rock. The model module produces a color mask, a blended overlay, class coverage, and metadata. The package then supplies a separate, deterministic visual-complexity result; it does not merge visual-complexity scores into the learned model’s labels.

## Limitations

> The learned-model result is not a flight-qualified landing-clearance system, and the visual-complexity result does not prove that a terrain area is dangerous or safe.

The model’s source metrics describe a fixed AI4Mars MSL test partition rather than the accuracy for an arbitrary new upload. Model outputs may be affected by image source, lighting, dust, compression, camera geometry, scale, and terrain distribution. The visual-complexity module only ranks relative local image edges, texture, and contrast. A host product must present both outputs as review evidence, retain the source image for inspection, and avoid treating either output as a mission, safety, or landing decision.

## References

[1] [NASA Open Data Portal, *AI4MARS: A Dataset for Terrain-Aware Autonomous Driving on Mars*](https://data.nasa.gov/dataset/ai4mars-a-dataset-for-terrain-aware-autonomous-driving-on-mars)
