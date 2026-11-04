export interface OfficialSourceCandidate {
  title: string;
  url: string;
  summary: string;
  issuingHost: string;
  reviewStatus: 'REQUIRES_LEGAL_REVIEW';
}

export interface OfficialSourceSearchResponse {
  municipality: string;
  searchedAt: string;
  candidates: OfficialSourceCandidate[];
}

export interface OfficialSourceImportResponse {
  sourceDocumentId: string;
  indexedChunks: number;
  status: string;
}

interface ApiErrorResponse {
  message?: string;
}

export interface OfficialSourceClient {
  search(municipality: string): Promise<OfficialSourceSearchResponse>;
  importPdf(
    municipality: string,
    candidate: OfficialSourceCandidate,
    regulationCode: string,
    ingestionKey: string,
  ): Promise<OfficialSourceImportResponse>;
}

type Fetcher = typeof fetch;

export const createOfficialSourceClient = (apiBaseUrl = '', fetcher: Fetcher = fetch): OfficialSourceClient => ({
  async search(municipality) {
    const response = await fetcher(`${apiBaseUrl}/api/regulations/sources/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ municipality }),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as ApiErrorResponse;
      throw new Error(errorBody.message ?? 'No fue posible buscar fuentes oficiales para este municipio.');
    }
    return response.json() as Promise<OfficialSourceSearchResponse>;
  },

  async importPdf(municipality, candidate, regulationCode, ingestionKey) {
    const response = await fetcher(`${apiBaseUrl}/api/regulations/documents/pdf/from-official-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-NormBuild-Ingestion-Key': ingestionKey,
      },
      body: JSON.stringify({
        title: candidate.title,
        jurisdiction: municipality,
        regulationCode,
        sourceUrl: candidate.url,
        legalReviewConfirmed: true,
      }),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as ApiErrorResponse;
      throw new Error(errorBody.message ?? 'No fue posible incorporar el documento oficial.');
    }
    return response.json() as Promise<OfficialSourceImportResponse>;
  },
});
