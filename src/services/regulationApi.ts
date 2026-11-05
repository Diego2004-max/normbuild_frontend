import type {
  ComplianceChecklistResponse,
  ComplianceQueryRequest,
} from '../types/regulation';
import { readChecklistStream } from './checklistStream';
import { createOfficialSourceClient } from './officialSourceClient';
import type { OfficialSourceCandidate, OfficialSourceImportResponse, OfficialSourceSearchResponse } from './officialSourceClient';
export type { OfficialSourceCandidate, OfficialSourceImportResponse, OfficialSourceSearchResponse } from './officialSourceClient';

export interface JurisdictionCoverage {
  jurisdiction: string;
  indexedSections: number;
  officialSources: number;
  lastIndexedAt: string | null;
  status: 'AVAILABLE' | 'NO_OFFICIAL_SOURCE';
}

const apiBaseUrl = import.meta.env.DEV ? '' : (import.meta.env.VITE_NORMBUILD_API_URL ?? '');
const officialSourceClient = createOfficialSourceClient(apiBaseUrl);

export const fetchJurisdictionCoverage = async (): Promise<JurisdictionCoverage[]> => {
  const response = await fetch(`${apiBaseUrl}/api/regulations/coverage`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error('No fue posible consultar la cobertura documental.');
  }
  return response.json() as Promise<JurisdictionCoverage[]>;
};

export const searchOfficialSources = (municipality: string) => officialSourceClient.search(municipality);

export const importOfficialSource = (
  municipality: string,
  candidate: OfficialSourceCandidate,
  regulationCode: string,
  ingestionKey: string,
)=> officialSourceClient.importSource(municipality, candidate, regulationCode, ingestionKey);

interface ApiErrorResponse {
  message?: string;
  details?: string[];
}

export const requestComplianceChecklist = async (
  request: ComplianceQueryRequest,
  onProgress: (response: ComplianceChecklistResponse) => void = () => undefined,
): Promise<ComplianceChecklistResponse> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 310_000);
  try {
    const response = await fetch(`${apiBaseUrl}/api/regulations/compliance-checklist/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      const fallbackMessage = 'No fue posible consultar la normativa en este momento.';
      const errorBody = (await response.json().catch(() => ({ message: fallbackMessage }))) as ApiErrorResponse;
      const details = errorBody.details?.filter(Boolean).join(' ');
      throw new Error([errorBody.message ?? fallbackMessage, details].filter(Boolean).join(' '));
    }

    if (!response.body || !response.headers.get('Content-Type')?.includes('text/event-stream')) {
      throw new Error('El servidor no pudo iniciar la revisión progresiva. Comprueba que el backend esté actualizado.');
    }
    return await readChecklistStream(response.body, onProgress);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('El análisis superó el tiempo de espera. Intenta nuevamente en unos momentos.');
    }
    if (error instanceof TypeError) {
      throw new Error('No fue posible conectar con el servidor. Comprueba que el backend esté en ejecución e intenta nuevamente.');
    }
    if (error instanceof SyntaxError) {
      throw new Error('El servidor devolvió una respuesta inválida. Intenta nuevamente en unos momentos.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
};
