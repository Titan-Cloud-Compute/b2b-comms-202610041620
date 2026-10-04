import { test, expect } from '@playwright/test';
import { login } from './spec/_support';

test.use({ serviceWorkers: 'block' });

test('admin sees AuditEntry records in chronological order and can record one', async ({ page }) => {
  const entries = [
    { id: 'e2', action: 'second.action', userId: 'u2', createdAt: '2026-01-02T00:00:00.000Z' },
    { id: 'e1', action: 'first.action', userId: 'u1', createdAt: '2026-01-01T00:00:00.000Z' },
  ];
  let user: { id: string; email: string; role: string } | null = null;
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const method = req.method().toUpperCase();
    const apiPath = new URL(req.url()).pathname.replace(/^.*\/api\//, '');
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (method === 'POST' && apiPath === 'auth/login') {
      user = { id: '1', email: 'admin@demo.local', role: 'ADMIN' };
      return json(user);
    }
    if (method === 'GET' && apiPath === 'users/me') return user ? json(user) : json({ message: 'Unauthorized' }, 401);
    if (method === 'GET' && apiPath === 'admin/audit-log') return json(entries);
    if (method === 'POST' && apiPath === 'admin/audit-log') {
      const body = req.postDataJSON() as { action: string; userId: string };
      const created = { id: 'e3', action: body.action, userId: body.userId, createdAt: '2026-01-03T00:00:00.000Z' };
      entries.push(created);
      return json(created, 201);
    }
    if (method === 'GET') return json([]);
    return json({ ok: true });
  });

  await login(page);
  await page.goto('/#/admin/audit-log');
  await expect(page.getByTestId('admin-audit-log-screen')).toBeVisible();
  await expect(page.locator('body')).toContainText('a list of AuditEntry records is displayed in chronological order returns 200');
  await expect(page.locator('body')).not.toContainText('chronological event log table');

  const rows = page.getByTestId('audit-log-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('first.action');
  await expect(rows.nth(1)).toContainText('second.action');

  await page.getByTestId('audit-log-action-input').fill('third.action');
  await page.getByTestId('audit-log-user-input').fill('u3');
  await page.getByTestId('audit-log-record-button').click();
  await expect(page.getByTestId('audit-log-created')).toContainText('third.action');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(2)).toContainText('third.action');
});
