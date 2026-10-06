const { chromium, expect } = require('@playwright/test');
const path = require('node:path');

const entitlements = {
  tier: 'PRO', displayName: 'Pro', tagline: '', maxBrands: 1,
  maxSocialAccountsPerBrand: 3, maxTeamMembers: 1, maxMonthlyPosts: 100,
  maxMonthlyAiGenerations: 100, maxStorageBytes: 10737418240,
  autopilotLevel: 'advanced', analyticsLevel: 'advanced', businessBrainLevel: 'advanced',
  aiRecommendations: true, contentRepurposing: true, clientManagement: false,
  whiteLabel: false, prioritySupport: false,
};

const samplePost = {
  id: 'visual-post', caption: 'A clear, concise caption prepared for review.',
  hashtags: ['#oyinca', '#creator'], status: 'NEEDS_APPROVAL',
  scheduledAt: new Date(Date.now() + 86400000).toISOString(), postType: 'SINGLE',
  targets: [{ platform: 'TIKTOK' }], media: [],
};

const bootstrap = {
  engine: { state: 'ACTIVE', approvalMode: 'MANUAL' },
  stats: { needsApprovalCount: 1, scheduledCount: 3, publishedCount: 8, failedCount: 0, mediaCount: 12, pendingPreview: [samplePost] },
  accounts: { socialAccounts: [{ platform: 'TIKTOK', handle: '@adam', status: 'CONNECTED' }], googleDrive: null },
  billing: { plan: 'PRO', subscribedPlan: 'PRO', status: 'ACTIVE', entitlements },
};

const billing = {
  ...bootstrap.billing, currency: 'USD', billingInterval: 'MONTHLY', cancelAtPeriodEnd: false,
  currentPeriodEnd: null, showProActivation: false,
  usage: {
    aiGenerations: { used: 18, limit: 100 }, posts: { used: 12, limit: 100 },
    storage: { used: 104857600, limit: 10737418240 }, socialAccounts: { used: 1, limit: 3 },
    clients: { used: 0, limit: 0 }, periodStart: new Date().toISOString(), periodEnd: new Date(Date.now() + 2592000000).toISOString(),
  },
};

function responseFor(url) {
  const { pathname, searchParams } = new URL(url);
  if (pathname.endsWith('/auth/me')) return { onboardingCompleted: true };
  if (pathname.endsWith('/dashboard/bootstrap')) return bootstrap;
  if (pathname.endsWith('/billing')) return billing;
  if (pathname.endsWith('/portfolio')) return { clients: [] };
  if (pathname.endsWith('/engine/state')) return { id: 'engine', brandId: 'qa-brand', state: 'ACTIVE', approvalMode: 'MANUAL', defaultTone: 'Professional', postsPerDay: 1, scheduleStartFrom: 'TODAY', customStartDate: null, timeZone: 'Africa/Lagos', schedulingPlatform: 'TIKTOK' };
  if (pathname.endsWith('/engine/activity')) return [{ id: 'event-1', type: 'APPROVAL_QUEUED', message: 'Post prepared for review.', createdAt: new Date().toISOString() }];
  if (pathname.endsWith('/engine/control-center')) return { state: 'ACTIVE', approvalMode: 'MANUAL', pipeline: { prepared: 1, scheduled: 3, awaitingApproval: 1, failed: 0, publishedLast24h: 2 }, nextScheduledAt: new Date(Date.now() + 3600000).toISOString(), connections: [], health: { ai: { status: 'ok', detail: null }, connections: { status: 'ok', detail: null }, publishing: { status: 'ok', detail: null }, scheduler: { status: 'ok', detail: null } } };
  if (pathname.endsWith('/engine/calendar-insights')) return { windowDays: 30, totalScheduled: 3, categoryCounts: { educational: 2, promotional: 1 }, pillarCounts: { education: 2, growth: 1 }, uncoveredPillars: [], backToBackRepeats: [] };
  if (pathname.endsWith('/posts/performance-summary')) return { hasData: true, sinceDays: 7, views: 12400, likes: 840, comments: 73, shares: 41, topPost: { id: 'top', caption: 'A top-performing post', platform: 'TIKTOK', viewsDelta: 6400 } };
  if (pathname.endsWith('/posts/stats')) return bootstrap.stats;
  if (pathname.endsWith('/posts')) return searchParams.get('status') === 'NEEDS_APPROVAL' ? [samplePost] : [];
  if (pathname.endsWith('/media/assets')) return [];
  if (pathname.endsWith('/oauth/accounts')) return { socialAccounts: [{ id: 'account-1', platform: 'TIKTOK', platformAccountId: 'tiktok-1', handle: '@adam', status: 'CONNECTED', health: 'HEALTHY', readiness: { ready: true, tested: true, productionApproved: true }, capabilities: { requiresTikTokCompletion: true } }] };
  return {};
}

(async () => {
  const browser = await chromium.launch();
  const pages = [
    ['/dashboard', 'dashboard'], ['/dashboard/media', 'create'],
    ['/dashboard/integrations', 'accounts'], ['/dashboard/engine', 'autopilot'],
    ['/dashboard/approval-queue', 'approval'], ['/dashboard/calendar', 'calendar'],
    ['/dashboard/analytics', 'analytics'],
  ];
  const modes = [
    ['desktop', 1440, 1000], ['mobile', 360, 800],
  ];
  try {
    for (const theme of ['light', 'dark']) {
      for (const [mode, width, height] of modes) {
        const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
        await context.addInitScript(({ theme }) => {
          localStorage.setItem('amai_user', JSON.stringify({ id: 'qa', email: 'qa@example.com', name: 'Adam Johnson', brandId: 'qa-brand', expiresAt: '2099-01-01T00:00:00.000Z' }));
          localStorage.setItem('marketing_os_theme', theme);
        }, { theme });
        await context.route('**/api/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responseFor(route.request().url())) }));
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.stack || error.message));
        for (const [route, name] of pages) {
          await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle', timeout: 120000 });
          await page.waitForTimeout(250);
          if (await page.getByRole('heading', { name: 'Something went wrong' }).count()) {
            throw new Error(`Runtime failure on ${route}: ${errors.join(' | ') || 'no pageerror captured'}`);
          }
          await expect(page.locator('main').first()).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
          expect(await page.locator('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay').count()).toBe(0);
          await page.screenshot({ path: path.join('test-results', `ui-${name}-${mode}-${theme}.png`), fullPage: true });
          if (route === '/dashboard' && mode === 'desktop' && theme === 'light') {
            const collapse = page.getByRole('button', { name: 'Collapse sidebar' });
            const sidebar = page.locator('aside').first();
            const expandedWidth = (await sidebar.boundingBox()).width;
            await collapse.click();
            await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
            const collapsedWidth = (await sidebar.boundingBox()).width;
            expect(collapsedWidth).toBeLessThan(expandedWidth);
            expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
            await page.screenshot({ path: path.join('test-results', 'ui-dashboard-desktop-light-collapsed.png'), fullPage: true });
            await page.getByRole('button', { name: 'Expand sidebar' }).click();
          }
        }
        expect(errors).toEqual([]);
        await context.close();
      }
    }
    console.log('PASS refined product surfaces at desktop/mobile in light/dark themes');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exit(1); });
