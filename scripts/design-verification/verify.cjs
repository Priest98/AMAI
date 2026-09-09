const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const outputDir = __dirname;
fs.mkdirSync(outputDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const scenario of [
    { name: 'landing-desktop', url: '/', width: 1440, height: 1000 },
    { name: 'landing-mobile', url: '/', width: 360, height: 800 },
    { name: 'login-mobile', url: '/login', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport: { width: scenario.width, height: scenario.height }, colorScheme: 'light' });
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    const response = await page.goto(`http://localhost:3000${scenario.url}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(2_000);
    const geometry = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim() || null,
      buttons: document.querySelectorAll('button').length,
      links: document.querySelectorAll('a').length,
    }));
    await page.screenshot({ path: path.join(outputDir, `${scenario.name}.png`), fullPage: true });
    results.push({ ...scenario, status: response?.status(), overflow: geometry.scrollWidth > geometry.clientWidth, errors, ...geometry });
    await page.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(outputDir, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) => !result.status || result.status >= 400 || result.overflow || result.errors.length)) process.exitCode = 1;
})();
