const { chromium, expect } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 360, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('amai_user', JSON.stringify({ id: 'qa', email: 'qa@example.com', name: 'QA', brandId: 'qa-brand', expiresAt: '2099-01-01' })));
    let agencyHealthy = false;
    let adminGate = 'unavailable';
    let pricingHealthy = false;
    await context.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      let status = 200;
      let data = {};
      if (path.endsWith('/auth/me')) data = { onboardingCompleted: true };
      else if (path.endsWith('/billing')) data = { plan: 'AGENCY', entitlements: { clientManagement: true, tier: 'AGENCY', analyticsLevel: 'advanced' } };
      else if (path.endsWith('/brands/qa-brand/organization')) data = { organizationId: 'org-qa' };
      else if (path.endsWith('/organizations/org-qa/portfolio')) {
        if (!agencyHealthy) { status = 503; data = { message: 'Controlled portfolio failure' }; }
        else data = { clientCount: 0, totals: { scheduled: 0, awaitingApproval: 0, publishingToday: 0, connectionIssues: 0 }, clients: [] };
      } else if (path.endsWith('/organizations/org-qa/members')) data = [];
      else if (path.endsWith('/admin/overview')) {
        if (adminGate === 'unavailable') { status = 503; data = { message: 'Controlled admin outage' }; }
        else if (adminGate === 'denied') { status = 403; data = { message: 'Forbidden' }; }
        else data = { generatedAt: new Date().toISOString(), users: {}, organizations: {}, subscriptions: {}, posts: {}, socialAccounts: {}, apiHealth: { unavailable: [] }, systemHealth: { status: 'nominal', reasons: [] } };
      } else if (path.endsWith('/admin/pricing')) {
        if (!pricingHealthy) { status = 503; data = { message: 'Controlled pricing failure' }; }
        else data = { prices: [{ tier: 'PRO', currency: 'USD', billingInterval: 'MONTHLY', regularAmount: 20, newUserAmount: null, source: 'static_config', providerObjectId: null, updatedByEmail: null, updatedAt: null }] };
      } else { status = 503; data = { message: 'Controlled unavailable response' }; }
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    });

    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto('http://localhost:3000/dashboard/agency', { timeout: 120000 });
    await expect(page.getByRole('button', { name: 'Retry portfolio' })).toBeVisible({ timeout: 30000 });
    agencyHealthy = true;
    await page.getByRole('button', { name: 'Retry portfolio' }).click();
    await expect(page.getByText('No clients yet.')).toBeVisible();

    await page.goto('http://localhost:3000/dashboard/admin/pricing', { timeout: 120000 });
    await expect(page.getByRole('button', { name: 'Retry access check' })).toBeVisible({ timeout: 30000 });
    adminGate = 'denied';
    await page.getByRole('button', { name: 'Retry access check' }).click();
    await expect(page.getByText('This area is restricted to Oyinca administrators.')).toBeVisible();

    adminGate = 'allowed';
    await page.reload();
    await expect(page.getByRole('button', { name: 'Retry pricing' })).toBeVisible({ timeout: 30000 });
    pricingHealthy = true;
    await page.getByRole('button', { name: 'Retry pricing' }).click();
    const edit = page.getByRole('button', { name: 'Edit PRO USD MONTHLY' });
    await expect(edit).toBeVisible();
    await edit.click();
    const dialog = page.getByRole('dialog', { name: 'Pro · USD · Monthly' });
    await expect(dialog).toBeVisible();
    for (const width of [1440, 1024, 768, 430, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      const box = await dialog.boundingBox();
      expect(box.x >= 0 && box.x + box.width <= width + 1).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(edit).toBeFocused();
    for (const [path, label] of [
      ['/dashboard/admin/customers', 'Retry customers'],
      ['/dashboard/admin/errors', 'Retry incidents'],
      ['/dashboard/admin/logs', 'Retry logs'],
      ['/dashboard/admin/audit-log', 'Retry audit log'],
    ]) {
      await page.goto(`http://localhost:3000${path}`, { timeout: 120000 });
      await expect(page.getByRole('button', { name: label })).toBeVisible({ timeout: 30000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
    await page.goto('http://localhost:3000/dashboard/admin/errors', { timeout: 120000 });
    await expect(page.getByRole('combobox', { name: 'Filter by source' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Filter by subsystem' })).toBeVisible();
    expect(pageErrors).toEqual([]);
    console.log('PASS agency retry, admin access states, admin list retries, named filters, pricing modal/focus/six widths');
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
