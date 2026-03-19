import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });

// Scroll to about, activate it, wait for orbit to run
await page.evaluate(() => {
  const s = document.querySelector('.about');
  if (s) {
    s.scrollIntoView({ behavior: 'instant', block: 'center' });
    s.classList.add('is-visible');
  }
});
await new Promise(r => setTimeout(r, 1400)); // let orbit run + pills fade in

const el = await page.$('.about');
const outPath = path.join(__dirname, 'temporary screenshots', 'screenshot-38-orbit-final.png');
await el.screenshot({ path: outPath });
await browser.close();
console.log('Saved: screenshot-38-orbit-final.png');
