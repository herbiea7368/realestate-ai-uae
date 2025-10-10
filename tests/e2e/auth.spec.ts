import { test, expect } from '@playwright/test';

test('auth flow: redirect to login then access gated routes', async ({ page }) => {
  await page.goto('/add-listing');
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel('Email').fill('agent@example.com');
  await page.getByLabel('Password').fill('secret12');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/add-listing/);

  await page.goto('/profile');
  await expect(page.getByText('Signed in as')).toBeVisible();
  await expect(page.getByText('agent@example.com')).toBeVisible();
});
