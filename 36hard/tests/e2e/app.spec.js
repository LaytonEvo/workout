import { expect, test } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const at = (page, iso) => page.clock.setFixedTime(new Date(iso));
const STRICT = [/No alcohol/, /Stuck to the diet/, /Planned tomorrow/, /Drank 3 litres/, /Daily cardio/, /Progress photo/];

async function tickAll(scope, rules = STRICT) {
  for (const r of rules) await scope.getByRole('checkbox', { name: r }).click();
}

async function loadSample(page) {
  await at(page, '2026-10-19T09:00:00+01:00');
  await page.goto('./');
  await page.getByRole('button', { name: 'Preview with sample data' }).click();
  await expect(page.getByRole('heading', { name: 'Day 15 of 36' })).toBeVisible();
}

async function exportJson(page) {
  await page.goto('./#/settings');
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export data' }).click(),
  ]);
  expect(dl.suggestedFilename()).toMatch(/^36-hard-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await dl.path();
  return { path, json: JSON.parse(readFileSync(path, 'utf8')) };
}

test('before 2 November: countdown and Day 0 baseline check-in', async ({ page }) => {
  await at(page, '2026-10-19T09:00:00+01:00');
  await page.goto('./');
  await expect(page.getByText('36 Hard · Day 0 setup')).toBeVisible();
  await expect(page.getByRole('heading', { name: '14 days to go' })).toBeVisible();
  await expect(page.getByText('Day 1 is Monday 2 November · 02/11/2026')).toBeVisible();

  await page.getByRole('radio', { name: 'st & lb' }).click();
  await page.getByLabel('Stone').fill('14');
  await page.getByLabel('Pounds').fill('0');
  await page.getByLabel('Waist in cm').fill('98');
  await page.getByRole('button', { name: /Save day 0 baseline/ }).click();
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Stone')).toHaveValue('14');
  await expect(page.getByLabel('Pounds')).toHaveValue('0');
});

test('a day passes when all strict rules are ticked; a missed day fails the challenge', async ({ page }) => {
  await at(page, '2026-11-02T08:00:00Z');
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Day 1 of 36' })).toBeVisible();
  await expect(page.getByText('Day 0 baseline due')).toBeVisible();
  await tickAll(page);
  await expect(page.getByText('On track')).toBeVisible();
  await expect(page.getByText('1 of 36 days passed')).toBeVisible();

  // Day 2 left blank; on Day 3 it counts as missed.
  await at(page, '2026-11-04T08:00:00Z');
  await page.reload();
  await expect(page.getByText('Failed on day 2')).toBeVisible();
  await expect(page.getByText(/Day 2 missed\. Keep tracking: 1 of 36 days passed/)).toBeVisible();

  // Day 2 (3 Nov) is yesterday, so it can be ticked off late without a confirm step.
  await page.goto('./#/calendar');
  await page.getByRole('gridcell', { name: /^Day 2,/ }).click();
  const sheet = page.getByRole('dialog');
  await tickAll(sheet);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('heading', { name: '2 of 36 passed' })).toBeVisible();
  await expect(page.getByText('On track')).toBeVisible();
});

test('editing an older day needs a confirm step', async ({ page }) => {
  await at(page, '2026-11-02T08:00:00Z');
  await page.goto('./');
  await tickAll(page);
  await at(page, '2026-11-05T08:00:00Z');
  await page.goto('./#/calendar');
  await page.reload();
  await page.getByRole('gridcell', { name: /^Day 1,/ }).click();
  const sheet = page.getByRole('dialog');
  const alcohol = sheet.getByRole('checkbox', { name: /No alcohol/ });
  await expect(alcohol).toHaveAttribute('aria-checked', 'true');

  await alcohol.click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(alcohol).toHaveAttribute('aria-checked', 'true');

  await alcohol.click();
  await page.getByRole('button', { name: 'Edit this day' }).click();
  await expect(alcohol).toHaveAttribute('aria-checked', 'false');
  // Unlocked now: no second prompt.
  await alcohol.click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(alcohol).toHaveAttribute('aria-checked', 'true');
});

test('logging a workout ticks rule 6, then shows last time and an increase prompt', async ({ page }) => {
  await at(page, '2026-11-02T08:00:00Z');
  await page.goto('./#/workout');
  await expect(page.getByRole('heading', { name: 'Upper A' })).toBeVisible();
  for (let i = 1; i <= 3; i++) {
    await page.getByLabel(`Bench press or dumbbell press set ${i} weight`).fill('40');
    await page.getByLabel(`Bench press or dumbbell press set ${i} reps`).fill('10');
  }
  await page.getByRole('button', { name: 'Mark session done' }).click();
  await expect(page.getByText('Session done today')).toBeVisible();

  await page.goto('./#/today');
  const strength = page.getByRole('checkbox', { name: /Strength workout/ });
  await expect(strength).toHaveAttribute('aria-checked', 'true');
  await expect(strength).toContainText('1/5 this week');

  // Next day: pick Upper A again via "Choose session".
  await at(page, '2026-11-03T08:00:00Z');
  await page.goto('./#/workout');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Lower A' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose session' }).click();
  await page.getByRole('listitem').filter({ hasText: 'Upper A' }).click();
  await expect(page.getByText('Last time · Mon 2 Nov')).toBeVisible();
  await expect(page.getByText(/Increase weight/)).toBeVisible();

  await page.getByRole('radio', { name: 'Home' }).click();
  await expect(page.getByRole('heading', { name: 'Kettlebell floor press' })).toBeVisible();

  await page.getByRole('button', { name: /Crunch day/ }).click();
  await expect(page.getByRole('heading', { name: 'Crunch day · 15-minute circuit' })).toBeVisible();
  await expect(page.getByText('Round 3', { exact: true }).first()).toBeVisible();
});

test('sample data loads on a preview date and wipes cleanly', async ({ page }) => {
  await loadSample(page);
  await expect(page.getByText('Week 2 check-in due')).toBeVisible();
  await expect(page.getByText('14 of 36 days passed')).toBeVisible();
  await page.goto('./#/progress');
  await expect(page.getByText('−1.3 kg')).toBeVisible();
  await page.getByRole('button', { name: 'Wipe sample data' }).click();
  await expect(page.getByRole('heading', { name: '14 days to go' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '14 days to go' })).toBeVisible();
});

test('export then import restores everything exactly', async ({ page }) => {
  await loadSample(page);
  const before = await exportJson(page);
  expect(Object.keys(before.json.data.days)).toHaveLength(15);

  await page.getByLabel('Type RESET to confirm').fill('RESET');
  await page.getByRole('button', { name: 'Reset all data' }).click();
  const empty = await exportJson(page);
  expect(empty.json.data.days).toEqual({});

  await page.getByTestId('import-file').setInputFiles(before.path);
  await page.getByRole('button', { name: 'Import and replace' }).click();
  await expect(page.getByText('Backup imported.')).toBeVisible();
  const after = await exportJson(page);
  expect(after.json.data).toEqual(before.json.data);

  await page.reload();
  const reloaded = await exportJson(page);
  expect(reloaded.json.data).toEqual(before.json.data);
});

test('every screen fits without sideways scrolling, light and dark', async ({ page }, info) => {
  mkdirSync('test-results/screens', { recursive: true });
  const shoot = async (name) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${name} overflows horizontally`).toBeLessThanOrEqual(0);
    await page.screenshot({ path: `test-results/screens/${info.project.name}-${name}.png`, fullPage: true });
  };
  await at(page, '2026-10-19T09:00:00+01:00');
  await page.goto('./');
  await expect(page.getByText('Day 0 setup')).toBeVisible();
  await shoot('setup');
  await loadSample(page);
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const route of ['today', 'calendar', 'workout', 'progress', 'rules', 'settings']) {
      await page.goto(`./#/${route}`);
      await page.waitForTimeout(250);
      await shoot(`${route}-${scheme}`);
    }
  }
});

test('installs as a PWA and works offline after first load', async ({ page, context, browserName }) => {
  await page.goto('./');
  const href = await page.locator('link[rel=manifest]').getAttribute('href');
  const manifestUrl = new URL(href, page.url()).href;
  const manifest = await (await page.request.get(manifestUrl)).json();
  expect(manifest).toMatchObject({ name: '36 Hard', display: 'standalone', start_url: '/workout/36hard/', scope: '/workout/36hard/' });
  const sizes = manifest.icons.map((i) => `${i.sizes}${i.purpose ? `:${i.purpose}` : ''}`);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512', '512x512:maskable']));
  for (const icon of manifest.icons) {
    const res = await page.request.get(new URL(icon.src, manifestUrl).href);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  }

  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  if (browserName === 'chromium') {
    const cdp = await context.newCDPSession(page);
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    expect(installabilityErrors).toEqual([]);
  }

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.tabbar')).toBeVisible();
  await page.goto('./#/progress');
  await expect(page.getByRole('heading', { name: "How it's going" })).toBeVisible();
  await page.goto('./#/workout');
  await expect(page.locator('.page-head h1')).toBeVisible();
  expect(await page.evaluate(() => document.fonts.check('40px Anton'))).toBe(true);
  await context.setOffline(false);
});
