# Evidence-First MARSBOUND Tasks

- [x] Simplify the entry screen into a restrained mission briefing and terrain acquisition interface.
- [x] Center the analysis view on the terrain image, intermediate OpenCV outputs, and computed risk map.
- [x] Present derived hazard, zone, and ranking data as scientific evidence rather than decorative dashboard metrics.
- [x] Elevate the landing recommendation as a compact mission decision with inspectable reasons and report data.
- [x] Retain verified sample data, preserve upload staging, and keep the demo flow explicit about backend limitations.
- [x] Verify the revised desktop and mobile workflow, then save a finished project checkpoint.

## AI4Mars Label Archive Review

- [x] Inventory the archive files, formats, and image-to-label relationships.
- [x] Quantify available terrain classes and annotation geometry relevant to rocks, craters, and safe-zone assessment.
- [x] Compare the label structure with MARSBOUND’s existing classical-vision evidence and risk-grid outputs.
- [x] Recommend immediate evidence-viewer integrations and a longer-term training/evaluation path.
- [x] Acquire matching source images and prepare an MSL-only merged-label seed for evaluation and baseline model development.

## AI4Mars MSL Source Acquisition

- [x] Verify the official merged AI4Mars archive contents, integrity guidance, and storage requirements.
- [x] Retrieve a direct matched MSL seed from the official merged archive without placing large data in the deployed web project.
- [x] Validate image-mask filename pairs and canonical MSL class indices in the retrieved seed.
- [x] Document the prepared subset and recommended backend integration path for MARSBOUND.
- [x] Defer expansion from the 49-pair MSL seed to the full 16,064-pair corpus until dedicated model training begins; the live backend does not require the full corpus.

## Labeled Terrain-Evidence Viewer

- [x] Select representative matched MSL terrain images and prepare colorized semantic-mask overlays.
- [x] Upload compact source, label, and overlay assets for deployment-safe web viewing.
- [x] Add a source/overlay/mask evidence viewer with terrain-class legend and pixel-level inspection.
- [x] Integrate the viewer into MARSBOUND’s evidence workflow without obscuring the existing OpenCV results.
- [x] Verify the viewer’s desktop and mobile controls, then save a project checkpoint.

## Segmentation Backend and Ground-Truth Comparison

- [x] Define the upload, inference, and prediction-versus-ground-truth result contract with clear model provenance.
- [x] Upgrade MARSBOUND for server-side uploads, API routes, and persistent analysis records.
- [x] Implement segmentation inference with a disclosed baseline method for arbitrary terrain uploads.
- [x] Compute class-level comparison metrics and confusion information for matched AI4Mars examples.
- [x] Add a prediction-versus-ground-truth interface with source, prediction, ground truth, and disagreement modes.
- [x] Validate the upload and comparison flows across desktop and mobile, then save a project checkpoint.
- [x] Verify the actual desktop UI upload-to-server-prediction path and persisted analysis result.
- [x] Verify mobile comparison controls and the updated upload workflow on the full-stack build.
- [x] Save the validated full-stack segmentation and comparison update as a project checkpoint.
- [x] Verify the actual mobile upload-to-server-prediction path on the full-stack build.
- [x] Save the verified full-stack segmentation and comparison update as a project checkpoint.
- [x] Save a final project checkpoint containing the verified backend, comparison interface, and responsive upload-flow validations.

## Semantic Segmentation Network

- [x] Confirm available training runtime and define an image-level train/validation/test split from matched MSL pairs.
- [x] Prepare normalized image-mask tensors with ignored unlabeled pixels and class-weighted loss.
- [x] Train a compact semantic segmentation network and save reproducible model artifacts.
- [x] Evaluate the network against the held-out test split and compare it with the prototype baseline.
- [x] Retain the selected evaluated baseline in server-side inference because the candidate did not improve held-out macro F1.
- [x] Verify trained-model evaluation artifacts and preserve the existing validated upload, prediction, comparison, and responsive UI flows.

## Rare-Hazard Segmentation Improvement

 - [x] Measure current big-rock, sand, bedrock, and soil coverage across the matched MSL seed and preserve an image-level held-out test split.
 - [x] Create high-resolution training patches that oversample labelled big-rock and sand regions while retaining regular terrain coverage.
 - [x] Train a class-balanced segmentation network with focal loss and terrain-preserving augmentation.
 - [x] Compare held-out macro F1 and per-class rare-hazard F1 against the original U-Net and server baseline.
 - [x] Promote a model only if it improves the held-out rare-hazard criteria; otherwise retain the current disclosed baseline.
 - [x] Document the experiment and update MARSBOUND only for a validated improvement.

## Expanded AI4Mars MSL Training

- [x] Retrieve an expanded, directly matched MSL image-and-label corpus from the official AI4Mars archive without adding large assets to the web project.
- [x] Audit class presence per image and build image-level stratified train, validation, and held-out test splits that include sand and big-rock evidence.
- [x] Train a segmentation candidate on the expanded corpus with rare-hazard-aware sampling and reproducible evaluation artifacts.
- [x] Compare the expanded-data candidate with the current server baseline using held-out macro F1 and per-class terrain F1.
- [x] Integrate a candidate into MARSBOUND only if it outperforms the active baseline under the fixed held-out evaluation.
- [x] Run tests and validate the upload-to-prediction web flow after any model integration, then document the outcome.

## Recovered Expanded-Corpus Training Run

- [x] Inventory the 118 matched MSL pairs recovered from the interrupted official selective download and retain their per-image provenance.
- [x] Build stratified image-level splits from the recovered corpus with rare terrain classes represented in both validation and test sets where available.
- [x] Train and evaluate an expanded-data candidate, then retain or promote it strictly by held-out macro F1 and per-class F1.

## Larger AI4Mars Corpus Expansion

- [x] Build a robust resumable retrieval workflow that expands beyond the recovered 118 matched MSL pairs without downloading unpaired data into the web project.
- [x] Save source-archive provenance for every newly retrieved rover image and semantic label pair.
- [x] Audit terrain-class coverage and create a new stratified image-level train, validation, and held-out test split with rare hazards represented where available.
- [x] Train and evaluate a larger-corpus candidate against the current v2 model on a common held-out test set.
- [x] Promote the candidate in MARSBOUND only if it improves held-out macro F1 and does not regress rare-hazard F1 materially.
- [x] Re-run unit tests and desktop/mobile upload validation after any model promotion, then document the result.

## 2,500-Pair AI4Mars MSL Training Expansion

- [x] Extend the resumable official MSL retrieval from 718 to 2,500 directly matched rover-image and label pairs without placing training assets in the web project.
- [x] Preserve archive provenance and run an integrity count for the full 2,500-pair corpus.
- [x] Create a fresh class-aware image-level train, validation, and held-out test split with sand and big-rock evidence in evaluation sets.
- [x] Train and evaluate a 2,500-pair terrain candidate against the active v3 model on the same held-out test set.
- [x] Promote the new candidate only if macro F1 improves and the sand/big-rock results remain at least as strong; retain v3 because v4 did not satisfy the rare-hazard threshold.
- [x] Validate the final server model with tests and actual desktop/mobile terrain-upload flows, then document the outcome.

## Hackathon Architecture Diagram

- [x] Map the current MARSBOUND client, server, computer-vision, terrain-classification, storage, database, and decision-support components.
- [x] Render a deterministic end-to-end architecture diagram with data-flow labels and an evidence-first decision boundary.
- [x] Deliver the diagram with a concise hackathon explanation of how imagery becomes an inspectable landing recommendation.

## 60% Accuracy Dataset Optimization Plan

- [x] Diagnose the active v3 model’s class-level limitations and dataset characteristics relative to the 60% pixel-accuracy target.
- [x] Define rare-hazard-aware sampling, split, label-quality review, and augmentation rules for the 2,500-pair corpus.
- [x] Specify a pretrained segmentation training and strict held-out evaluation path that can improve accuracy without hiding sand or big-rock failures.
- [x] Deliver prioritized milestones and promotion criteria for progressing from the current baseline toward a trustworthy 60% pixel-accuracy target.

## MobileNetV3-U-Net Candidate

- [x] Prepare a reproducible pretrained MobileNetV3-U-Net configuration with rare-hazard-aware crops, augmentation, ignored unlabelled pixels, and a balanced segmentation loss.
- [x] Train the candidate using only the fixed 1,900-image training partition and select checkpoints using only the 300-image validation partition.
- [x] Compare the selected candidate with active v3 on the untouched 300-image test set using pixel accuracy, macro F1, sand F1, and big-rock F1.
- [x] Promote the candidate into MARSBOUND only if it improves the shared held-out evaluation without reducing rare-hazard F1; otherwise retain v3.
- [x] Run tests and desktop/mobile upload validation after any promotion, then document the model-selection result.

## MobileNetV3-U-Net Promotion

- [x] Export the selected epoch-11 MobileNetV3-U-Net checkpoint to a production-compatible ONNX artifact with its 256×256 RGB normalization contract.
- [x] Replace the v3 handcrafted classifier in the server analysis path with ONNX-backed MobileNetV3-U-Net inference and truthful held-out-test provenance.
- [x] Validate the promoted model with unit tests, production build checks, and desktop/mobile upload-to-prediction flows.
- [x] Document the fixed-split promotion decision, model limitations, and deployment rationale before checkpointing the hackathon demo.

## GitHub Source Publication

- [x] Create a new private GitHub repository for the verified MARSBOUND project.
- [x] Push the current project source and confirm the new remote repository state.

## GitHub Repository Visibility

- [x] Change the MARSBOUND GitHub repository visibility from private to public and verify the public URL.

## Hackathon README

- [x] Write a public, hackathon-ready README covering the problem, system, training protocol, honest results, setup, and demo flow.
- [x] Validate the README content and push it to the public MARSBOUND GitHub repository.

## NSIC Rulebook Review

- [x] Review the NSIC rulebook for originality, pre-existing-work, eligibility, and disclosure requirements relevant to using this independent MARSBOUND project copy.

## Fresh NSIC Prototype Plan

- [x] Define a fresh eight-hour Mars terrain prototype using a public model or library with clear licensing, attribution, and provenance disclosure.

## OpenCV-Only NSIC Fallback

- [x] Revise the fresh NSIC prototype into an OpenCV-only terrain-complexity workflow that does not require a pre-trained model or any MARSBOUND component.

## OpenCV Dry Run

- [x] Run and inspect an isolated OpenCV-only Mars-image terrain-complexity proof of concept using newly sourced input imagery.

## Independent Copy Verification

- [x] Verify the live ML path with an uploaded Mars terrain image: server segmentation completed, generated 256 × 256 prediction artifacts, and displayed the Server prediction result.
- [x] Verify the CV review experience for the built-in terrain sample: saved preprocessing, edge, circular-feature, and hazard artifacts render correctly; CV is currently saved demonstration evidence, not per-upload runtime processing.

## Dynamic CV for Uploads

- [x] Define a deterministic per-upload CV result contract containing derived maps, circular-feature candidates, and grid-level visual-complexity evidence.
- [x] Implement server-side preprocessing, edge, circle-candidate, and grid-evidence generation for uploaded images.
- [x] Return CV artifacts and metrics with ML segmentation, and render only the upload-specific CV evidence after a live analysis.
- [x] Add automated tests and run an end-to-end uploaded-image validation for the combined ML-plus-CV pipeline.
- [x] Derive every live-upload mission summary and progress label from the dynamic CV result rather than the saved sample defaults.
- [x] Auto-select the lowest-complexity uploaded-image grid cell and confirm the live summary matches the ranked grid.

## GitHub Publication

- [x] Commit and push the completed dynamic CV implementation to the analysis-tools-for-22 repository on the dedicated dynamic-cv-webapp branch, preserving its existing master branch.
