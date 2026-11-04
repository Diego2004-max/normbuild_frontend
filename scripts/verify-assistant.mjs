import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const moduleUrl = process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright';
const { chromium } = await import(moduleUrl);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const description = 'Tengo un lote de 200 m². Quiero ocupar 100 m² en el primer piso y construir 200 m² en total, distribuidos en dos pisos con altura total de 6 metros. ¿Cómo se calculan los índices de ocupación y construcción de mi propuesta y qué información necesito para saber si están permitidos?';
await mkdir('test-results', { recursive: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.NORMBUILD_PREVIEW_URL ?? 'http://127.0.0.1:5173');
  await page.getByLabel('Descripción del proyecto').fill(description);
  const startedAt = Date.now();
  await page.getByRole('button', { name: 'Generar checklist de cumplimiento' }).click();
  await page.getByRole('heading', { name: 'Cálculos de tu propuesta' }).waitFor({ timeout: 5000 });
  const firstDataMilliseconds = Date.now() - startedAt;
  assert.equal(await page.getByText('0,50 (50 %)', { exact: true }).isVisible(), true);
  assert.equal(await page.getByText('1,00', { exact: true }).isVisible(), true);
  await page.screenshot({ path: 'test-results/assistant-progress-desktop.png' });
  await page.getByRole('heading', { name: 'Fuentes recuperadas' }).waitFor({ timeout: 35000 });
  const sourceButtons = page.getByRole('button', { name: 'Ver texto completo', exact: true });
  assert.ok(await sourceButtons.count() > 0);
  await sourceButtons.first().click();
  const sourceContainer = page.getByRole('button', { name: 'Mostrar menos' }).locator('..');
  assert.equal(await sourceContainer.locator('p').count(), 2);
  const expandedSource = await sourceContainer.locator('p').last().innerText();
  assert.ok(expandedSource.length > 360);
  assert.match(expandedSource.trim(), /[.!?]$/);
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled, null, { timeout: 180000 });
  const completionMilliseconds = Date.now() - startedAt;
  assert.equal(await page.getByText('El modelo local no pudo completar la respuesta.', { exact: false }).count(), 0);
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'test-results/assistant-final-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path: 'test-results/assistant-final-mobile.png', fullPage: true });
  const cachedAt = Date.now();
  await page.getByRole('button', { name: 'Generar checklist de cumplimiento' }).click();
  await page.getByText('1,00', { exact: true }).waitFor({ timeout: 5000 });
  await page.waitForFunction(() => !document.querySelector('button[type="submit"]').disabled, null, { timeout: 5000 });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ firstDataMilliseconds, completionMilliseconds,
    cachedMilliseconds: Date.now() - cachedAt, expandedSourceCharacters: expandedSource.length,
    desktopAndMobilePassed: true }, null, 2));
} finally {
  await browser.close();
}
