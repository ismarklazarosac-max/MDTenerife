import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URL_ARG = process.argv[2] || 'http://localhost:3000';
const LABEL   = process.argv[3] || 'scroll';
const CLIP_Y  = process.argv[4] ? parseInt(process.argv[4]) : null;
const OUTPUT_DIR = path.join(__dirname, 'temporary screenshots');

function getNextFilename() {
  const existing = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.startsWith('screenshot-') && f.endsWith('.png'))
    .map(f => { const m = f.match(/^screenshot-(\d+)/); return m ? parseInt(m[1], 10) : 0; });
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `screenshot-${next}-${LABEL}.png`;
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(URL_ARG, { waitUntil: 'networkidle0', timeout: 30000 });

  // Force all reveal elements visible
  await page.evaluate(() => {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  });
  await new Promise(r => setTimeout(r, 800));

  const filename = getNextFilename();
  const opts = { path: path.join(OUTPUT_DIR, filename), fullPage: !CLIP_Y };
  if (CLIP_Y) opts.clip = { x: 0, y: CLIP_Y, width: 1440, height: 900 };
  await page.screenshot(opts);
  await browser.close();
  console.log('Saved:', filename);
})().catch(e => { console.error(e.message); process.exit(1); });
