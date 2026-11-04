import test from 'node:test';
import assert from 'node:assert/strict';

const messages = [];
globalThis.self = {
  postMessage(message) {
    messages.push(message);
  },
};

await import('../src/workers/regulationWorker.ts');

test('normalizes multiline project text and returns a word count from the worker', () => {
  globalThis.self.onmessage({
    data: {
      jurisdiction: 'Bogotá D.C.',
      projectDescription: '  Quiero construir\n\n una casa   de dos pisos.  ',
    },
  });

  assert.equal(messages.length, 1);
  assert.equal(messages[0].formattedDescription, 'Quiero construir\nuna casa de dos pisos.');
  assert.equal(messages[0].wordCount, 7);
  assert.deepEqual(messages[0].issues, []);
});

test('returns Spanish validation issues for missing jurisdiction and short description', () => {
  globalThis.self.onmessage({
    data: {
      jurisdiction: '  ',
      projectDescription: 'Casa corta',
    },
  });

  assert.deepEqual(messages[1].issues, [
    { field: 'jurisdiction', message: 'Selecciona una jurisdicción válida.' },
    { field: 'projectDescription', message: 'Describe el proyecto con más detalle para consultar la norma.' },
  ]);
});

test('rejects descriptions over the 1600-character validation limit', () => {
  globalThis.self.onmessage({
    data: {
      jurisdiction: 'Pasto',
      projectDescription: `vivienda lote ${'área '.repeat(400)}`,
    },
  });

  assert.deepEqual(messages[2].issues, [
    { field: 'projectDescription', message: 'La descripción supera el máximo permitido de 1600 caracteres.' },
  ]);
});
