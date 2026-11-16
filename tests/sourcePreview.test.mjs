import test from 'node:test';
import assert from 'node:assert/strict';
import { sourcePreview } from '../src/services/sourcePreview.ts';

test('shows substantive text after a short article heading', () => {
  const content = `Artículo 310. ${'La norma requiere consultar la ficha del predio. '.repeat(12)}`;
  assert.match(sourcePreview(content), /La norma requiere consultar/);
  assert.ok(sourcePreview(content).length > 100);
});
