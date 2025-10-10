import { test, expect } from '@playwright/test';

test('smoke: user can validate permit and generate copy', async ({ page }) => {
  page.on('console', (message) => {
    console.log('[browser]', message.type().toUpperCase(), message.text());
  });
  await page.goto('/add-listing');

  const consent = page.getByLabel('Consent to data use');
  await consent.waitFor({ state: 'visible' });
  await expect(consent).toBeEnabled();
  await consent.check();
  const trakheesiInput = page.getByLabel('Trakheesi Number');
  await expect(trakheesiInput).toBeEnabled();
  await trakheesiInput.fill('12345678');
  await expect(page.getByRole('button', { name: 'Validate & Generate' })).toBeEnabled();
  await page.evaluate(() => (window as unknown as { __TEST_TRIGGER?: () => Promise<void> }).__TEST_TRIGGER?.());

  const successBanner = page.locator('.banner.success');
  await expect(successBanner).toBeVisible({ timeout: 30_000 });
  await expect(successBanner).toContainText('Listing copy generated successfully.');
  await expect(successBanner).toContainText('Permit 12345678');
});
