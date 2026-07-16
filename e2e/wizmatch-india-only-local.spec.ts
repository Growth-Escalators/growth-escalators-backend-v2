import { expect, test, type Page, type Route } from '@playwright/test';

// India-only sourcing: the Job Leads page defaults to an India-only view (sends
// region=india) and the misleading "Outreach" nav decoy is removed. Mocked-
// session spec (no backend), matching the wizmatch-*-local style.

const session = {
  token: 'local-wizmatch-india-only-token',
  user: { id: 'io-user-1', name: 'IO Admin', email: 'io-admin@example.test', role: 'admin', tenantSlug: 'wizmatch' },
};

async function installWizmatchSession(page: Page) {
  await page.addInitScript((value) => {
    localStorage.setItem('crm_active_tenant_slug', 'wizmatch');
    localStorage.setItem('wizmatch_crm_token', value.token);
    localStorage.setItem('wizmatch_crm_user', JSON.stringify(value.user));
    localStorage.setItem('wizmatch_crm_permissions', JSON.stringify({ staffingPilotAccess: true, isAdminTier: true }));
    localStorage.setItem('ge_crm_token', 'local-growth-token');
  }, session);
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installBaseMocks(page: Page) {
  await page.route('**/api/**', (route) => json(route, { items: [], total: 0 }));
  await page.route('**/api/wizmatch/staffing/access', (route) => json(route, { allowed: true, phases: { A: true, B: true, C: true }, capabilities: {} }));
  await page.route('**/api/wizmatch/sourcing/status', (route) => json(route, { config: {}, latestRuns: [], providerAccounts: {} }));
  await page.route('**/api/inbox/unread-count', (route) => json(route, { count: 0 }));
  await page.route('**/api/finance/leaves/pending-count', (route) => json(route, { count: 0 }));
}

test.describe('India-only sourcing', () => {
  test.beforeEach(async ({ page }) => {
    await installWizmatchSession(page);
    await installBaseMocks(page);
  });

  test('Job Leads defaults to region=india and the toggle can switch to all regions', async ({ page }) => {
    const regions: string[] = [];
    await page.route('**/api/wizmatch/signals?**', (route) => {
      regions.push(new URL(route.request().url()).searchParams.get('region') || '(none)');
      return json(route, { items: [], total: 0 });
    });

    await page.goto('/wizmatch/job-leads');
    await page.waitForLoadState('networkidle');
    expect(regions.length).toBeGreaterThan(0);
    expect(regions[0]).toBe('india');

    // Switching the toggle sends region=all (existing US signals become viewable).
    await page.getByRole('combobox').filter({ hasText: /India only/ }).selectOption('all');
    await expect.poll(() => regions.at(-1)).toBe('all');
  });

  test('the misleading "Outreach" nav decoy is gone from Wizmatch nav', async ({ page }) => {
    await page.route('**/api/wizmatch/signals?**', (route) => json(route, { items: [], total: 0 }));
    await page.goto('/wizmatch/job-leads');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: 'Outreach', exact: true })).toHaveCount(0);
    // Sanity: nav itself rendered (a primary always-on destination is present).
    await expect(page.getByRole('link', { name: 'Today', exact: true })).toBeVisible();
  });
});
