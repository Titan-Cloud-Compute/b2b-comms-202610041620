/**
 * Styling card: every story page renders inside the shared sidebar/top-bar
 * layout, and the sidebar groups those pages as Vendor, Customer and Admin.
 */
import { test, expect } from '@playwright/test';
import { mockApi, login } from './spec/_support';

test.use({ serviceWorkers: 'block' });

const PAGES: Array<[string, string]> = [
  ['vendor/profile', 'vendor-profile-screen'],
  ['admin/customers', 'admin-customers-screen'],
  ['channels', 'channels-screen'],
  ['orders', 'orders-screen'],
  ['invoices', 'invoices-screen'],
  ['settings/notifications', 'settings-notifications-screen'],
  ['admin/audit-log', 'admin-audit-log-screen'],
];

for (const [path, testId] of PAGES) {
  test(`/${path} renders inside the shared shell`, async ({ page }) => {
    await mockApi(page);
    await login(page);
    await page.goto(`/#/${path}`);
    const screen = page.getByTestId(testId);
    await expect(screen).toBeVisible();
    await expect(page.locator(`.main-content .routed-area [data-testid="${testId}"]`)).toHaveCount(1);
    await expect(page.locator('.sidebar')).toHaveCount(1);
  });
}

test('sidebar groups story pages under Vendor, Customer and Admin', async ({ page }) => {
  await mockApi(page);
  await login(page);
  await page.goto('/#/orders');
  await expect(page.getByTestId('orders-screen')).toBeVisible();
  const labels = (await page.locator('.nav-group-label').allTextContents()).map(t => t.trim());
  for (const group of ['Vendor', 'Customer', 'Admin']) {
    expect(labels).toContain(group);
  }
});
