/**
 * Whole-system styling regression spec.
 *
 * Asserts every listed page uses the token font-family and shared layout
 * primitives at 1280×800 (desktop) and 390×844 (mobile) viewports,
 * with no horizontal overflow.
 *
 * Hermetic: all /api/** calls are mocked, serviceWorkers are blocked.
 * Does NOT pixel-snapshot — uses computed-style assertions instead so the
 * oracle is deterministic across CI hosts without stored baselines.
 */
import { test, expect } from '@playwright/test';
import { mockApi, login } from './spec/_support';

test.use({ serviceWorkers: 'block' });

/** Feature pages that live inside the shared sidebar/top-bar shell. */
const FEATURE_PAGES: Array<[string, string]> = [
  ['vendor/profile',           'vendor-profile-screen'],
  ['admin/customers',          'admin-customers-screen'],
  ['channels',                 'channels-screen'],
  ['orders',                   'orders-screen'],
  ['invoices',                 'invoices-screen'],
  ['settings/notifications',   'settings-notifications-screen'],
  ['admin/audit-log',          'admin-audit-log-screen'],
];

const VIEWPORTS = [
  { width: 1280, height: 800,  label: 'desktop' },
  { width: 390,  height: 844,  label: 'mobile'  },
] as const;

/** True when the page body scrolls wider than the viewport (horizontal overflow). */
async function hasHorizontalOverflow(page: import('@playwright/test').Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.label} (${vp.width}×${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    // ── (a) Feature pages — token font, shared primitives, no overflow ─────────
    for (const [path, testId] of FEATURE_PAGES) {
      test(`/${path} uses token font and shared primitives`, async ({ page }) => {
        await mockApi(page);
        await login(page);
        await page.goto(`/#/${path}`);

        const screen = page.getByTestId(testId);
        await expect(screen).toBeVisible({ timeout: 10_000 });

        // Root element must carry the shared .page class
        await expect(screen).toHaveClass(/\bpage\b/);

        // Must be rendered inside the shell's .main-content element
        await expect(
          page.locator(`.main-content [data-testid="${testId}"]`),
        ).toHaveCount(1);

        // Must contain at least one .card primitive
        await expect(screen.locator('.card').first()).toBeVisible();

        // h1 computed font-family must include the display token ("Sofia Sans")
        const h1FontFamily = await page.evaluate((): string => {
          const h1 = document.querySelector('h1');
          return h1 ? getComputedStyle(h1).fontFamily : '';
        });
        expect(
          h1FontFamily,
          `/${path} h1 font-family should reference Sofia Sans`,
        ).toContain('Sofia Sans');

        // No horizontal overflow
        expect(
          await hasHorizontalOverflow(page),
          `/${path} must not overflow horizontally at ${vp.width}px`,
        ).toBe(false);
      });
    }

    // ── (b) Dashboard and Settings ────────────────────────────────────────────
    for (const shellPath of ['dashboard', 'settings']) {
      test(`/${shellPath} has visible .main-content and no horizontal overflow`, async ({ page }) => {
        await mockApi(page);
        await login(page);
        await page.goto(`/#/${shellPath}`);
        await expect(page.locator('.main-content')).toBeVisible({ timeout: 10_000 });
        expect(
          await hasHorizontalOverflow(page),
          `/${shellPath} must not overflow horizontally at ${vp.width}px`,
        ).toBe(false);
      });
    }

    // ── (c) Pre-login pages — body uses Inter, no overflow ───────────────────
    for (const authPath of ['login', 'signup/1']) {
      test(`/${authPath} body uses Inter font and has no horizontal overflow`, async ({ page }) => {
        await mockApi(page);
        await page.goto(`/#/${authPath}`);
        await page.waitForLoadState('networkidle');

        const bodyFontFamily = await page.evaluate((): string =>
          getComputedStyle(document.body).fontFamily,
        );
        expect(
          bodyFontFamily,
          `/${authPath} body font-family should reference Inter`,
        ).toContain('Inter');

        expect(
          await hasHorizontalOverflow(page),
          `/${authPath} must not overflow horizontally at ${vp.width}px`,
        ).toBe(false);
      });
    }
  });
}
