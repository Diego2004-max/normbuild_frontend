import test from 'node:test';
import assert from 'node:assert/strict';
import { findConflictingJurisdiction } from '../src/services/jurisdictionMismatch.ts';

const jurisdictions = ['Bogotá D.C.', 'Pasto', 'Medellín'];

test('flags a description that names another indexed city', () => {
  assert.equal(findConflictingJurisdiction('Pasto', 'Predio urbano ubicado en Bogotá D.C.', jurisdictions), 'Bogotá D.C.');
});

test('accepts the selected city and descriptions without a city', () => {
  assert.equal(findConflictingJurisdiction('Bogotá D.C.', 'Predio en Bogotá de 180 m².', jurisdictions), null);
  assert.equal(findConflictingJurisdiction('Pasto', 'Predio urbano de 180 m².', jurisdictions), null);
});
