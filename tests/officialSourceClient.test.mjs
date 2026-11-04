import test from 'node:test';
import assert from 'node:assert/strict';
import { createOfficialSourceClient } from '../src/services/officialSourceClient.ts';

const candidate = {
  title: 'Plan de Ordenamiento Territorial',
  url: 'https://planeacion.municipio.gov.co/pot.pdf',
  summary: 'Acuerdo municipal de ordenamiento territorial.',
  issuingHost: 'planeacion.municipio.gov.co',
  reviewStatus: 'REQUIRES_LEGAL_REVIEW',
};

test('searches a municipality through the same-origin API and returns official candidates', async () => {
  let request;
  const client = createOfficialSourceClient('', async (url, options) => {
    request = { url, options };
    return Response.json({ municipality: 'Neiva', searchedAt: '2026-11-04T12:00:00Z', candidates: [candidate] });
  });

  const result = await client.search('Neiva');

  assert.equal(request.url, '/api/regulations/sources/search');
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(JSON.parse(request.options.body), { municipality: 'Neiva' });
  assert.equal(result.candidates[0].issuingHost, 'planeacion.municipio.gov.co');
});

test('preserves the Spanish API error when source discovery is unavailable', async () => {
  const client = createOfficialSourceClient('', async () => Response.json(
    { message: 'La búsqueda web de fuentes oficiales no está configurada en el servidor.' },
    { status: 503 },
  ));

  await assert.rejects(client.search('Neiva'), /no está configurada/);
});

test('sends the administrative key only with an explicitly confirmed PDF import', async () => {
  let request;
  const client = createOfficialSourceClient('/api-root', async (url, options) => {
    request = { url, options };
    return Response.json({ sourceDocumentId: 'document-1', indexedChunks: 24, status: 'INDEXED' }, { status: 202 });
  });

  const result = await client.importPdf('Neiva', candidate, 'Acuerdo 001 de 2024', 'private-key');

  assert.equal(request.url, '/api-root/api/regulations/documents/pdf/from-official-url');
  assert.equal(request.options.headers['X-NormBuild-Ingestion-Key'], 'private-key');
  assert.equal(request.options.signal instanceof AbortSignal, true);
  assert.equal(request.options.signal.aborted, false);
  assert.deepEqual(JSON.parse(request.options.body), {
    title: candidate.title,
    jurisdiction: 'Neiva',
    regulationCode: 'Acuerdo 001 de 2024',
    sourceUrl: candidate.url,
    legalReviewConfirmed: true,
  });
  assert.equal(result.indexedChunks, 24);
});

test('shows a Spanish timeout message when official PDF indexing takes too long', async () => {
  const client = createOfficialSourceClient('', async () => {
    throw new DOMException('Timed out', 'TimeoutError');
  });

  await assert.rejects(
    client.importPdf('Neiva', candidate, 'Acuerdo 001 de 2024', 'private-key'),
    /La incorporación tardó demasiado/,
  );
});

test('shows a Spanish connection message when the backend cannot be reached', async () => {
  const client = createOfficialSourceClient('', async () => {
    throw new TypeError('Failed to fetch');
  });

  await assert.rejects(client.search('Neiva'), /No fue posible conectar con el servidor/);
});
