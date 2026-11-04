import type { WorkerValidationIssue, WorkerValidationResult } from '../types/regulation';

interface WorkerValidationRequest {
  jurisdiction: string;
  projectDescription: string;
}

const normalizeDescription = (value: string): string =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .join('\n');

const countWords = (value: string): number =>
  value
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;

const validateRequest = (request: WorkerValidationRequest): WorkerValidationResult => {
  const formattedDescription = normalizeDescription(request.projectDescription);
  const wordCount = countWords(formattedDescription);
  const issues: WorkerValidationIssue[] = [];

  if (request.jurisdiction.trim().length < 3) {
    issues.push({
      field: 'jurisdiction',
      message: 'Selecciona una jurisdicción válida.',
    });
  }

  if (formattedDescription.length < 12 || wordCount < 4) {
    issues.push({
      field: 'projectDescription',
      message: 'Describe el proyecto con más detalle para consultar la norma.',
    });
  }

  if (formattedDescription.length > 1600) {
    issues.push({
      field: 'projectDescription',
      message: 'La descripción supera el máximo permitido de 1600 caracteres.',
    });
  }

  return {
    formattedDescription,
    wordCount,
    issues,
  };
};

self.onmessage = (event: MessageEvent<WorkerValidationRequest>) => {
  self.postMessage(validateRequest(event.data));
};

export {};
