// Renders the app icons with headless Chromium so they use the real Anton font.
// Run: npm run icons
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const font = readFileSync(`${root}node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2`).toString('base64');

// `safe` shrinks the mark into the maskable safe zone.
const svg = (safe = false) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <style>@font-face{font-family:A;src:url(data:font/woff2;base64,${font})}</style>
  <rect width="512" height="512" rx="${safe ? 0 : 112}" fill="#0c0d0f"/>
  <g transform="${safe ? 'translate(256 256) scale(.78) translate(-256 -256)' : ''}">
    <rect x="96" y="368" width="320" height="34" rx="8" fill="#c6ff2e"/>
    <text x="256" y="360" text-anchor="middle" font-family="A" font-size="300" fill="#f2f3ee" letter-spacing="-6">36</text>
    <text x="256" y="452" text-anchor="middle" font-family="A" font-size="46" fill="#c6ff2e" letter-spacing="14">HARD</text>
  </g>
</svg>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
async function render(file, size, safe) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg(safe).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${root}public/icons/${file}`, omitBackground: true });
}
await render('icon-192.png', 192);
await render('icon-512.png', 512);
await render('icon-maskable-512.png', 512, true);
await render('apple-touch-icon.png', 180, true);
await browser.close();

// Favicon: plain SVG without the embedded font (falls back to Impact-like system faces).
writeFileSync(`${root}public/icons/favicon.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0c0d0f"/><rect x="12" y="46" width="40" height="5" rx="2" fill="#c6ff2e"/><text x="32" y="43" text-anchor="middle" font-family="Anton,Impact,'Arial Narrow',sans-serif" font-weight="700" font-size="36" fill="#f2f3ee">36</text></svg>\n`);
console.log('icons written');
