const { chromium } = require('@playwright/test');

(async () => {
  const baseUrl = process.env.OYINCA_TEST_URL || 'http://localhost:3000';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const video = page.locator('.oy-film-frame video');
  await video.waitFor({ state: 'attached' });
  await page.waitForFunction(() => {
    const element = document.querySelector('.oy-film-frame video');
    return element && Number.isFinite(element.duration) && element.duration > 0;
  }, { timeout: 30_000 });

  const contract = await video.evaluate((element) => ({
    autoplay: element.autoplay,
    muted: element.muted,
    loop: element.loop,
    playsInline: element.playsInline,
    controls: element.controls,
    preload: element.preload,
    objectFit: getComputedStyle(element).objectFit,
    duration: element.duration,
    readyState: element.readyState,
  }));

  const transition = await video.evaluate(async (element) => {
    const samples = [];
    let endedEvents = 0;
    let pauseEvents = 0;
    element.addEventListener('ended', () => { endedEvents += 1; });
    element.addEventListener('pause', () => { pauseEvents += 1; });
    element.currentTime = Math.max(0, element.duration - 0.35);
    await element.play();
    const startedAt = performance.now();
    while (performance.now() - startedAt < 2_000) {
      samples.push({ time: element.currentTime, paused: element.paused, ended: element.ended, readyState: element.readyState });
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (samples.some((sample) => sample.time > element.duration - 0.2) && element.currentTime < 1) break;
    }
    return { samples, endedEvents, pauseEvents, finalTime: element.currentTime, paused: element.paused, ended: element.ended };
  });

  const crossedBoundary = transition.samples.some((sample) => sample.time > contract.duration - 0.2)
    && transition.finalTime < 1;
  const passed = contract.autoplay && contract.muted && contract.loop && contract.playsInline
    && !contract.controls && contract.preload === 'metadata' && contract.objectFit === 'cover'
    && crossedBoundary && !transition.paused && !transition.ended && transition.pauseEvents === 0;

  console.log(JSON.stringify({ contract, transition, crossedBoundary, passed }, null, 2));
  await browser.close();
  if (!passed) process.exitCode = 1;
})();
