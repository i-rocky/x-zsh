import { chromium } from 'playwright';
import fs from 'node:fs';

const url = process.argv[2];
const outDir = process.argv[3];
const frames = Number(process.argv[4] || 74);
const interval = Number(process.argv[5] || 100);

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({
  viewport: { width: 840, height: 420 },
  deviceScaleFactor: 2,
});
await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('x-zsh');
// let the element mount + IntersectionObserver fire and the run begin
await page.waitForTimeout(500);
const cap = await page.$('#cap');

for (let i = 0; i < frames; i++) {
  await cap.screenshot({ path: `${outDir}/f${String(i).padStart(3, '0')}.png` });
  await page.waitForTimeout(interval);
}

await browser.close();
console.log(`captured ${frames} frames to ${outDir}`);
