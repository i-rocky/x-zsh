import { chromium } from 'playwright';

const url = process.argv[2];
const out = process.argv[3];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'load' });
await page.waitForSelector('x-zsh');
await page.waitForTimeout(400);
// drive the terminal to its finished state (instant, no animation)
await page.evaluate(() => {
  var t = document.querySelector('x-zsh');
  t.pause(); t.idx = 0; t.rebuild(0);
  for (var i = 0; i < t.items.length; i++) t.stepForward();
});
await page.waitForTimeout(200);
const og = await page.$('#og');
await og.screenshot({ path: out });
await browser.close();
console.log('wrote ' + out);
