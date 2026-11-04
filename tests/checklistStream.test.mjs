import test from 'node:test';
import assert from 'node:assert/strict';
import { readChecklistStream } from '../src/services/checklistStream.ts';

const response = (mode, text = '') => ({
  answer: text,
  citations: [{ id: 'source-1', excerpt: 'Texto íntegro de la fuente.' }],
  generationMode: mode,
  riskLevel: 'Por verificar',
});

const bodyFrom = (text, chunkSize = 7) => {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      for (let index = 0; index < bytes.length; index += chunkSize) {
        controller.enqueue(bytes.slice(index, index + chunkSize));
      }
      controller.close();
    },
  });
};

test('decodes split UTF-8 data, CRLF events and progress before completion', async () => {
  const progress = [];
  const stream = `event:progress\r\ndata:${JSON.stringify(response('PENDING'))}\r\n\r\nevent:complete\r\ndata:${JSON.stringify(response('GENERATIVE', 'Ocupación propuesta: 0,50.'))}\r\n\r\n`;
  const result = await readChecklistStream(bodyFrom(stream, 1), value => progress.push(value));
  assert.equal(progress.length, 1);
  assert.equal(progress[0].generationMode, 'PENDING');
  assert.equal(result.answer, 'Ocupación propuesta: 0,50.');
});

test('does not treat a disconnected stream as a completed answer', async () => {
  const stream = `event:progress\ndata:${JSON.stringify(response('PENDING'))}\n\n`;
  await assert.rejects(readChecklistStream(bodyFrom(stream), () => {}), /se cerró antes de completar/);
});

test('preserves the Spanish server error', async () => {
  const stream = `event:error\ndata:${JSON.stringify({ message: 'Ollama no está disponible.' })}\n\n`;
  await assert.rejects(readChecklistStream(bodyFrom(stream), () => {}), /Ollama no está disponible/);
});

test('rejects pending data sent as a complete event', async () => {
  const stream = `event:complete\ndata:${JSON.stringify(response('PENDING'))}\n\n`;
  await assert.rejects(readChecklistStream(bodyFrom(stream), () => {}), /no se completó/);
});
