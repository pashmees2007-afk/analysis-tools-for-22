import { analyzeTerrain } from "../src/index.js";

/**
 * Example adapter shape for an HTTP framework. `uploadedFile.buffer` and
 * `storeArtifact` belong to the host application, not this package.
 */
export async function analyzeUploadedTerrain(uploadedFile: { originalname: string; buffer: Buffer }) {
  const result = await analyzeTerrain({
    filename: uploadedFile.originalname,
    image: uploadedFile.buffer,
  });

  return {
    analysisId: result.analysisId,
    sourceUrl: await storeArtifact(`${result.analysisId}/source.png`, result.source.png),
    modelMaskUrl: await storeArtifact(`${result.analysisId}/model-mask.png`, result.model.maskPng),
    modelOverlayUrl: await storeArtifact(`${result.analysisId}/model-overlay.png`, result.model.overlayPng),
    complexityOverlayUrl: await storeArtifact(`${result.analysisId}/complexity-overlay.png`, result.visualComplexity.overlayPng),
    metadata: {
      model: result.model.metadata,
      classCoverage: result.model.classCoverage,
      topReviewCells: result.visualComplexity.topReviewCells,
      limitations: result.limitations,
    },
  };
}

declare function storeArtifact(key: string, file: Buffer): Promise<string>;

