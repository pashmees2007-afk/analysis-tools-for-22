export type GridSettings = {
  columns: number;
  rows: number;
};

export type TerrainAnalysisOptions = Partial<GridSettings>;

export type TerrainAnalysisInput = {
  filename: string;
  image: Buffer;
  options?: TerrainAnalysisOptions;
};

export type TerrainClassCoverage = {
  classId: number;
  className: string;
  pixels: number;
  share: number;
};

export type ModelMetadata = {
  version: string;
  label: string;
  inputSize: number;
  inference: string;
  training: string;
  modelArtifact: string;
};

export type ModelAnalysisResult = {
  metadata: ModelMetadata;
  width: number;
  height: number;
  classCoverage: TerrainClassCoverage[];
  maskPng: Buffer;
  overlayPng: Buffer;
};

export type ReviewCell = {
  rank: number;
  row: number;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
  edgeDensity: number;
  textureVariance: number;
  contrast: number;
  score: number;
};

export type VisualComplexityResult = {
  width: number;
  height: number;
  grid: GridSettings;
  cells: ReviewCell[];
  topReviewCells: ReviewCell[];
  edgeMapPng: Buffer;
  textureMapPng: Buffer;
  overlayPng: Buffer;
};

export type TerrainAnalysisResult = {
  analysisId: string;
  source: {
    filename: string;
    width: number;
    height: number;
    png: Buffer;
  };
  model: ModelAnalysisResult;
  visualComplexity: VisualComplexityResult;
  limitations: string[];
};
