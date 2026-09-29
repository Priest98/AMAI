const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 360, height: 800 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.addInitScript(() => localStorage.setItem('marketing_os_theme', 'light'));
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => errors.push(`page: ${error.message}`));
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 60_000 });
    const check = await page.evaluate(() => ({
      title: document.title,
      headline: document.querySelector('h1')?.textContent?.trim(),
      textLength: document.body.innerText.trim().length,
      errorOverlay: !!document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay'),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      viewportWidth: document.documentElement.clientWidth,
      contentWidth: document.documentElement.scrollWidth,
      navHeight: Math.round(document.querySelector('header')?.getBoundingClientRect().height || 0),
      startFreeLinks: [...document.querySelectorAll('a')].filter((link) => link.textContent?.toLowerCase().includes('start free')).length,
      missingHrefLinks: [...document.querySelectorAll('a')].filter((link) => !link.getAttribute('href')).length,
      sections: [...document.querySelectorAll('main > section')].map((section) => ({
        className: section.className,
        height: Math.round(section.getBoundingClientRect().height),
      })),
    }));
    await page.screenshot({ path: `landing-${viewport.name}.png`, fullPage: true });
    results.push({ viewport, check, errors });
    await page.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
