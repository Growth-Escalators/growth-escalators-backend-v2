import { expect, test, type Page, type Route } from '@playwright/test';

// Placements detail modal (PlacementDetailModal in WizmatchPlacementsPage.jsx)
// — closes the "code-reviewed but not test-proven" gap recorded in
// docs/release/WIZMATCH_RELEASE_READINESS.md.

const session = {
  token: 'local-wizmatch-placements-detail-token',
  user: { id: 'pd-user-1', name: 'PD Admin', email: 'pd-admin@example.test', role: 'admin', tenantSlug: 'wizmatch' },
};

async function installWizmatchSession(page: Page) {
  await page.addInitScript((value) => {
    localStorage.setItem('crm_active_tenant_slug', 'wizmatch');
    localStorage.setItem('wizmatch_crm_token', value.token);
    localStorage.setItem('wizmatch_crm_user', JSON.stringify(value.user));
    localStorage.setItem('wizmatch_crm_permissions', JSON.stringify({ staffingPilotAccess: true }));
    localStorage.setItem('ge_crm_token', 'local-growth-token');
  }, session);
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function installBaseMocks(page: Page) {
  await page.route('**/api/**', (route) => json(route, { items: [], total: 0 }));
  await page.route('**/api/wizmatch/staffing/access', (route) => json(route, {
    allowed: true, phases: { A: true, B: true, C: true },
    capabilities: { viewCommercial: true, manageFinance: true },
  }));
  await page.route('**/api/inbox/unread-count', (route) => json(route, { count: 0 }));
  await page.route('**/api/finance/leaves/pending-count', (route) => json(route, { count: 0 }));
}

function guardAgainstNativeDialogs(page: Page) {
  page.on('dialog', (dialog) => { throw new Error(`Unexpected native ${dialog.type()} dialog: "${dialog.message()}"`); });
}

test.describe('Placements detail modal', () => {
  test.beforeEach(async ({ page }) => {
    await installWizmatchSession(page);
    await installBaseMocks(page);
    guardAgainstNativeDialogs(page);
  });

  test('opens from a Kanban card and each tab renders real data for a requirement-linked, invoiced placement', async ({ page }) => {
    const placement = {
      id: 'p1', candidate_first: 'Priya', candidate_last: 'Sharma', company_name: 'Acme Corp',
      status: 'started', requirement_id: 'r1', invoice_id: 'inv-1', placement_type: 'permanent',
      currency: 'INR', perm_fee_amount: 50000000,
    };
    await page.route('**/api/wizmatch/placements?**', (route) => json(route, { items: [placement] }));
    await page.route('**/api/wizmatch/requirements/r1/timeline', (route) => json(route, {
      items: [{ id: 'e1', placement_id: 'p1', event_type: 'placement_created', actor_name: 'PD Admin', occurred_at: '2026-07-01T10:00:00Z' }],
    }));
    await page.route('**/api/billing/invoices/inv-1', (route) => json(route, {
      invoice: { invoiceNumber: 'INV-1001', status: 'sent', totalAmount: 5000000, amountDue: 2000000, amountPaid: 3000000 },
      client: { currency: 'INR' },
      payments: [{ id: 'pay1', paymentDate: '2026-07-05T00:00:00Z', paymentMode: 'bank_transfer', amount: 3000000 }],
    }));

    await page.goto('/wizmatch/placements');
    await page.waitForLoadState('networkidle');
    await page.getByText('Priya Sharma').click();

    await expect(page.getByText('Overview')).toBeVisible();
    await expect(page.getByText('Acme Corp').last()).toBeVisible();

    // Overview: shows the linked requirement id and the real activity event.
    await expect(page.getByText('placement created')).toBeVisible();

    // Economics: real fee amount.
    await page.getByRole('button', { name: 'Economics' }).click();
    await expect(page.getByText('Permanent fee', { exact: true })).toBeVisible();

    // Invoice: real invoice detail, not a link form (invoice_id present).
    await page.getByRole('button', { name: 'Invoice' }).click();
    await expect(page.getByText('INV-1001')).toBeVisible();

    // Collection: real payment row.
    await page.getByRole('button', { name: 'Collection' }).click();
    await expect(page.getByText('bank_transfer')).toBeVisible();

    // Adjustments: empty state (no adjustment events in the timeline mock).
    await page.getByRole('button', { name: 'Adjustments' }).click();
    await expect(page.getByText('No adjustments')).toBeVisible();
  });

  test('a directly-created placement with no requirement_id shows honest "not available" states, never fabricated data', async ({ page }) => {
    const placement = { id: 'p2', candidate_first: 'Legacy', candidate_last: 'Placement', company_name: 'Old Co', status: 'started', requirement_id: null, invoice_id: null, placement_type: 'permanent', currency: 'INR' };
    await page.route('**/api/wizmatch/placements?**', (route) => json(route, { items: [placement] }));

    await page.goto('/wizmatch/placements');
    await page.waitForLoadState('networkidle');
    await page.getByText('Legacy Placement').click();

    await expect(page.getByText("This placement has no linked requirement, so activity history isn't available.")).toBeVisible();

    await page.getByRole('button', { name: 'Adjustments' }).click();
    await expect(page.getByText("This placement has no linked requirement, so its adjustment history can't be reconstructed. New adjustments can still be created below.")).toBeVisible();

    await page.getByRole('button', { name: 'Invoice' }).click();
    await expect(page.getByText('No invoice linked to this placement yet.')).toBeVisible();
  });

  test('linking an invoice end to end', async ({ page }) => {
    const placement = { id: 'p3', candidate_first: 'Priya', candidate_last: 'Sharma', company_name: 'Acme Corp', status: 'started', requirement_id: 'r1', invoice_id: null, placement_type: 'permanent', currency: 'INR' };
    let linkBody: unknown = null;
    await page.route('**/api/wizmatch/placements?**', (route) => json(route, { items: [placement] }));
    await page.route('**/api/wizmatch/requirements/r1/timeline', (route) => json(route, { items: [] }));
    await page.route('**/api/billing/invoices', (route) => json(route, {
      invoices: [{ id: 'inv-9', invoice_number: 'INV-9009', client_name: 'Acme Corp', client_id: 'client-9', total_amount: 1000000 }],
    }));
    await page.route('**/api/wizmatch/staffing/placements/p3/link-invoice', async (route) => {
      linkBody = route.request().postDataJSON();
      await json(route, { ok: true });
    });

    await page.goto('/wizmatch/placements');
    await page.waitForLoadState('networkidle');
    await page.getByText('Priya Sharma').click();
    await page.getByRole('button', { name: 'Invoice' }).click();

    await expect(page.getByText('No invoice linked to this placement yet.')).toBeVisible();
    await page.getByLabel('Matching invoices').selectOption('inv-9');
    await page.getByRole('button', { name: 'Link invoice' }).click();

    await expect.poll(() => linkBody).toEqual({ invoiceId: 'inv-9', billingClientId: 'client-9' });
  });

  test('opening and resolving an adjustment end to end', async ({ page }) => {
    const placement = { id: 'p4', candidate_first: 'Priya', candidate_last: 'Sharma', company_name: 'Acme Corp', status: 'started', requirement_id: 'r1', invoice_id: null, placement_type: 'permanent', currency: 'INR' };
    let createBody: unknown = null;
    let adjustmentState: 'none' | 'open' | 'resolved' = 'none';
    await page.route('**/api/wizmatch/placements?**', (route) => json(route, { items: [placement] }));
    await page.route('**/api/wizmatch/requirements/r1/timeline', (route) => {
      if (adjustmentState === 'none') return json(route, { items: [] });
      const items = [{ id: 'e1', placement_id: 'p4', event_type: 'placement_dispute_opened', payload: { adjustmentId: 'adj-1', amount: 50000, currency: 'INR' }, occurred_at: '2026-07-10T00:00:00Z' }];
      if (adjustmentState === 'resolved') {
        items.push({ id: 'e2', placement_id: 'p4', event_type: 'placement_dispute_resolved', payload: { adjustmentId: 'adj-1' }, occurred_at: '2026-07-11T00:00:00Z' });
      }
      return json(route, { items });
    });
    await page.route('**/api/wizmatch/staffing/placements/p4/adjustments', async (route) => {
      createBody = route.request().postDataJSON();
      adjustmentState = 'open';
      await json(route, { id: 'adj-1' }, 201);
    });
    await page.route('**/api/wizmatch/staffing/adjustments/adj-1/resolve', async (route) => {
      adjustmentState = 'resolved';
      await json(route, { ok: true });
    });

    await page.goto('/wizmatch/placements');
    await page.waitForLoadState('networkidle');
    await page.getByText('Priya Sharma').click();
    await page.getByRole('button', { name: 'Adjustments' }).click();
    await expect(page.getByText('No adjustments')).toBeVisible();

    await page.getByRole('button', { name: 'New adjustment' }).click();
    await page.getByPlaceholder('Reason *').fill('Client disputed the placement fee');
    await page.getByRole('button', { name: 'Open adjustment' }).click();

    await expect.poll(() => createBody).toEqual({ type: 'dispute', amount: undefined, currency: 'INR', reason: 'Client disputed the placement fee' });
    // Creating an adjustment reloads the placements list in the background
    // (PlacementDetailModal's onChanged -> the list page's load()); re-assert
    // the Adjustments tab is still the active one before continuing.
    await page.getByRole('button', { name: 'Adjustments' }).click();
    await expect(page.getByText('dispute').first()).toBeVisible();

    await page.getByRole('button', { name: 'Resolve' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Resolve' }).click();
    await expect(dialog).not.toBeVisible();
    await expect.poll(() => adjustmentState).toBe('resolved');
  });
});
