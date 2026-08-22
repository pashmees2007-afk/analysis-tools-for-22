# Dynamic CV Upload Validation

The upload route now executes two server-side analyses against the same normalized 256 × 256 RGB image: MobileNetV3-U-Net segmentation and deterministic visual-complexity analysis.

The deterministic CV output includes a contrast-normalized grayscale image, a Sobel-gradient edge overlay, connected-edge circular-shape candidates, a visual-complexity overlay, and a 5 × 5 grid. The grid score combines normalized edge density with circular-shape pressure. It is explicitly presented as evidence for human review, not as a terrain-safety or landing recommendation.

During live validation with an uploaded Mars terrain image, analysis `d641a989-5b2e-4f68-9e0e-17962495b295` completed successfully. The server returned ML prediction artifacts and four CV artifacts, surfaced eight circular-shape candidates, 8,679 edge pixels, and 25 upload-specific grid cells. The interface displayed the live CV artifacts and changed the grid report to complexity review bands.

A final upload after the summary update completed as analysis `04a9a17a-69f5-491f-aad5-bf3b38c32330`. The visible mission summary correctly changed to **ML segmentation + deterministic CV** and displayed the selected grid cell as a visual-complexity review, rather than preserving the saved sample’s recommendation wording.

The final consistency validation completed as analysis `b10b110d-7da5-4c04-9741-af15dddd142e`. The interface automatically selected **B3**, the same 0.9 / 10 lowest-complexity cell at rank one in the live grid. The hero, progress strip, review panel, and exportable evidence consistently identified the upload as live ML segmentation plus deterministic CV.

Automated validation also passed: TypeScript checking, the five-test Vitest suite, and the production build all completed successfully.
