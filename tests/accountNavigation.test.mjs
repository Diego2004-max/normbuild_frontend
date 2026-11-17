import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAccountNavigation } from '../src/services/accountNavigation.ts';

test('redirects anonymous visitors away from protected pages', () => {
  assert.equal(resolveAccountNavigation('/', true, false), '/acceder');
});

test('redirects authenticated visitors away from the login page', () => {
  assert.equal(resolveAccountNavigation('/acceder', false, true), '/');
});

test('allows the requested route when no redirect is necessary', () => {
  assert.equal(resolveAccountNavigation('/acceder', false, false), true);
  assert.equal(resolveAccountNavigation('/', true, true), true);
});
