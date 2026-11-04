import { EventSourceParserStream } from 'eventsource-parser/stream';
import type { ComplianceChecklistResponse } from '../types/regulation';

export const readChecklistStream = async (
  body: ReadableStream<Uint8Array>,
  onProgress: (response: ComplianceChecklistResponse) => void,
): Promise<ComplianceChecklistResponse> => {
  const decoder = new TextDecoder();
  const reader = body
    .pipeThrough(new TransformStream<Uint8Array, string>({
      transform(chunk, controller) {
        controller.enqueue(decoder.decode(new Uint8Array(chunk), { stream: true }));
      },
      flush(controller) {
        controller.enqueue(decoder.decode());
      },
    }))
    .pipeThrough(new EventSourceParserStream({ maxBufferSize: 2_000_000 }))
    .getReader();
  try {
    while (true) {
      const { value: event, done } = await reader.read();
      if (done) {
        throw new Error('La conexión se cerró antes de completar la revisión normativa. Intenta nuevamente.');
      }
      if (event.event === 'error') {
        const error = JSON.parse(event.data) as { message?: string };
        throw new Error(error.message ?? 'No fue posible completar la revisión normativa.');
      }
      if (event.event !== 'progress' && event.event !== 'complete') {
        continue;
      }
      const response = JSON.parse(event.data) as ComplianceChecklistResponse;
      if (typeof response.answer !== 'string' || !Array.isArray(response.citations)) {
        throw new Error('El servidor devolvió una respuesta inválida.');
      }
      if (event.event === 'complete') {
        if (response.generationMode === 'PENDING') {
          throw new Error('La revisión normativa no se completó. Intenta nuevamente.');
        }
        return response;
      }
      onProgress(response);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
};
