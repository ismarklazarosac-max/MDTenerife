/**
 * screenshot.mjs — Puppeteer screenshot tool
 *
 * Usage:
 *   node screenshot.mjs http://localhost:3000
 *   node screenshot.mjs http://localhost:3000 hero
 *   node screenshot.mjs file:///C:/Users/Gaming/Desktop/MI%20WEB%20mdt/index.html
 *
 * Saves to: ./temporary screenshots/screenshot-N.png  (auto-incremented)
 * Or with label: screenshot-N-hero.png
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────
const OUTPUT_DIR  = path.join(__dirname, 'temporary screenshots');
const URL_ARG     = process.argv[2] || `file:///${__dirname.replace(/\\/g, '/')}/index.html`;
const LABEL       = process.argv[3] || '';
const VIEWPORT_W  = 1440;
const VIEWPORT_H  = 900;
const FULL_PAGE   = true;   // set false for viewport-only screenshot

// ── Ensure output dir exists ────────────────────────────
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ── Auto-increment filename ─────────────────────────────
function getNextFilename() {
  const existing = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith('screenshot-') && f.endsWith('.png'))
    .map(f => {
      const match = f.match(/^screenshot-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  const label = LABEL ? `-${LABEL}` : '';
  return `screenshot-${next}${label}.png`;
}

// ── Main ────────────────────────────────────────────────
(async () => {
  console.log(`\n📸  Taking screenshot of: ${URL_ARG}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ]
  });

  const page = await browser.newPage();

  await page.setViewport({ width: VIEWPORT_W, height: VIEWPORT_H });

  // Wait for fonts + animations to settle
  await page.goto(URL_ARG, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 800));

  const filename = getNextFilename();
  const filepath = path.join(OUTPUT_DIR, filename);

  await page.screenshot({
    path: filepath,
    fullPage: FULL_PAGE,
  });

  await browser.close();

  console.log(`✅  Saved: temporary screenshots/${filename}`);
  console.log(`   Path: ${filepath}\n`);
})().catch(err => {
  console.error('❌  Screenshot failed:', err.message);
  process.exit(1);
});
