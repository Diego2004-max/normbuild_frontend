import type { ComplianceChecklistResponse, ComplianceQueryRequest } from '../types/regulation';
import { readChecklistStream } from './checklistStream';
import type { OfficialSourceCandidate, OfficialSourceImportResponse } from './officialSourceClient';

export interface AccountProfile {
  id: string;
  email: string;
  role: 'CITIZEN' | 'ADMIN';
}

export interface QueryHistoryItem {
  id: string;
  jurisdiction: string;
  projectDescription: string;
  answer: string;
  riskLevel: string;
  generationMode: string;
  createdAt: string;
}

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`/api/account${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? 'No fue posible completar la solicitud de cuenta.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
};

export const getAccount = () => request<AccountProfile>('/me');
export const getGoogleConfig = () => request<{ clientId: string }>('/google/config');
export const loginWithGoogle = (credential: string) => request<AccountProfile>('/google', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }),
});
export const registerAccount = (email: string, password: string) => request<AccountProfile>('/register', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
});
export const loginAccount = (email: string, password: string) => request<AccountProfile>('/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
});
export const logoutAccount = () => request<void>('/logout', { method: 'POST' });
export const fetchHistory = () => request<QueryHistoryItem[]>('/history');
export const deleteHistoryItem = (id: string) => request<void>(`/history/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const importAdminSource = (
  municipality: string, candidate: OfficialSourceCandidate, regulationCode: string,
) => request<OfficialSourceImportResponse>('/admin/sources', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: candidate.title, jurisdiction: municipality, regulationCode,
    sourceUrl: candidate.url, legalReviewConfirmed: true,
  }),
});
export const requestSavedChecklist = async (
  query: ComplianceQueryRequest,
  onProgress: (response: ComplianceChecklistResponse) => void = () => undefined,
): Promise<ComplianceChecklistResponse> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 310_000);
  try {
    const response = await fetch('/api/account/checklists/stream', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(query), signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { message?: string };
      throw new Error(body.message ?? 'No fue posible guardar la consulta.');
    }
    if (!response.body || !response.headers.get('Content-Type')?.includes('text/event-stream')) {
      throw new Error('El servidor no pudo iniciar la revisión normativa.');
    }
    return await readChecklistStream(response.body, onProgress);
  } finally {
    window.clearTimeout(timeout);
  }
};
