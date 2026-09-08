const { chromium, expect } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 360, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('amai_user', JSON.stringify({ id: 'qa', email: 'qa@example.com', name: 'QA', brandId: 'qa-brand', expiresAt: '2099-01-01' })));
    const plan = 'CREATOR';
    await context.route('**/api/**', route => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      let status = 200;
      let data = {};
      if (path.endsWith('/auth/me')) data = { onboardingCompleted: true };
      else if (path.endsWith('/billing')) data = { plan, entitlements: { tier: plan, displayName: plan === 'CREATOR' ? 'Creator' : 'Agency', clientManagement: plan === 'AGENCY', analyticsLevel: 'advanced' } };
      else if (path.endsWith('/brands/qa-brand/organization')) data = { organizationId: 'org-qa' };
      else if (path.endsWith('/organizations/org-qa/portfolio')) data = { clientCount: 1, totals: { scheduled: 0, awaitingApproval: 0, publishingToday: 0, connectionIssues: 0 }, clients: [{ id: 'qa-brand', name: 'Primary brand', industry: null, connections: [], connectionIssueCount: 0, scheduledCount: 0, awaitingApprovalCount: 0, publishingTodayCount: 0 }] };
      else if (path.endsWith('/organizations/org-qa/creator-overview')) data = { windowDays: 30, since: new Date().toISOString(), accounts: [{ brandId: 'qa-brand', name: 'Primary brand', industry: null, logo: null, connections: [], connectionIssueCount: 0, publishedCount: 0, measuredCount: 0, totalEngagement: 0 }], usage: { posts: { used: 0, limit: 50, remaining: 50 } }, crossAccountRecommendation: null, hasEnoughDataForComparison: false, unavailableMetrics: [] };
      else if (req.method() === 'POST' && path.endsWith('/organizations/org-qa/brands')) { status = 503; data = { message: 'Controlled create failure' }; }
      else if (path.endsWith('/admin/overview')) data = { generatedAt: new Date().toISOString(), accounts: { totalOrganizations: 1, totalBrands: 1, usersByPlan: {} }, revenue: { mrrEstimateByCurrency: {}, note: '' }, posts: { failedTotal: 0, failedLast7d: 0, publishedLast7d: 1 }, apiHealth: { aiProviderRequestsAllTime: 1, aiProviderErrorsAllTime: 0, aiKeysCurrentlyDisabled: 0, connectionsExpired: 0, unavailable: [] }, systemHealth: { status: 'ok' } };
      else if (path.endsWith('/admin/health/run-now')) { status = 503; data = { message: 'Controlled health action failure' }; }
      else if (path.endsWith('/admin/health')) data = { overallStatus: 'HEALTHY', subsystems: [], engineHeartbeatAt: null };
      else if (path.includes('/admin/customers/')) { status = 503; data = { message: 'Controlled customer detail failure' }; }
      else if (path.includes('/admin/errors/')) { status = 503; data = { message: 'Controlled incident detail failure' }; }
      else { status = 503; data = { message: 'Controlled unavailable response' }; }
      return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('http://localhost:3000/dashboard/clients', { timeout: 120000 });
    const addClient = page.getByRole('button', { name: 'Add client' });
    await addClient.click();
    let dialog = page.getByRole('dialog', { name: 'Add client' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Business name').fill('Synthetic client');
    await dialog.getByRole('button', { name: 'Create client' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Controlled create failure');
    await page.keyboard.press('Escape');
    await expect(addClient).toBeFocused();

    await page.goto('http://localhost:3000/dashboard/creator', { timeout: 120000 });
    const addAccount = page.getByRole('button', { name: /Add your second account/i });
    await addAccount.click();
    dialog = page.getByRole('dialog', { name: 'Add your second account' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(addAccount).toBeFocused();

    await page.goto('http://localhost:3000/dashboard/admin/customers/customer-qa', { timeout: 120000 });
    await expect(page.getByRole('button', { name: 'Retry customer' })).toBeVisible({ timeout: 30000 });
    await page.goto('http://localhost:3000/dashboard/admin/errors/error-qa', { timeout: 120000 });
    await expect(page.getByRole('button', { name: 'Retry incident' })).toBeVisible({ timeout: 30000 });
    await page.goto('http://localhost:3000/dashboard/admin/system-health', { timeout: 120000 });
    await expect(page.getByRole('heading', { name: 'System health' })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Run now' }).click();
    await expect(page.getByText('Controlled health action failure', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'System health' })).toBeVisible();

    for (const width of [1440, 1024, 768, 430, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
    expect(await page.locator('[data-nextjs-dialog]').count()).toBe(0);
    expect(errors).toEqual([]);
    console.log('PASS client/creator dialogs, detail retries, health action preservation, focus, six widths');
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
