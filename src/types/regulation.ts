export interface ComplianceQueryRequest {
  jurisdiction: string;
  projectDescription: string;
}

export interface CitedRegulationResponse {
  id: string;
  title: string;
  regulationCode: string;
  articleReference: string;
  sourceUrl: string | null;
  similarity: number;
  excerpt: string;
  sourceType: 'INDEXED_VECTOR' | 'LIVE_WEB';
}

export interface ComplianceChecklistResponse {
  answer: string;
  riskLevel: string;
  citations: CitedRegulationResponse[];
  generatedAt: string;
  generationMode?: 'PENDING' | 'GENERATIVE' | 'WEB_RESEARCH' | 'UNAVAILABLE' | 'NO_CONTEXT';
  projectAnalysis?: ProjectAnalysisResponse;
}

export interface ProjectAnalysisResponse {
  lotAreaSquareMeters: number | null;
  occupiedAreaSquareMeters: number | null;
  totalBuiltAreaSquareMeters: number | null;
  occupancyIndex: number | null;
  constructionIndex: number | null;
  unoccupiedAreaSquareMeters: number | null;
  observations: string[];
}

export interface WorkerValidationIssue {
  field: 'jurisdiction' | 'projectDescription';
  message: string;
}

export interface WorkerValidationResult {
  formattedDescription: string;
  wordCount: number;
  issues: WorkerValidationIssue[];
}
