import { test, expect } from '@playwright/test';

const SEARCH_URL = process.env.NEXT_PUBLIC_SEARCH_URL ?? 'http://localhost:4010';

test('search results page renders listings', async ({ page }) => {
  await page.route(`${SEARCH_URL}/facets`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        community: [
          { value: 'Downtown Dubai', count: 12 },
          { value: 'Dubai Marina', count: 20 }
        ],
        bedrooms: [
          { value: 1, count: 8 },
          { value: 2, count: 15 }
        ]
      })
    });
  });

  await page.route(new RegExp(`${SEARCH_URL}/search.*`), async (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get('q');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total: 2,
        page: 1,
        pageSize: 12,
        items: [
          {
            id: '1',
            title: 'Downtown duplex',
            price_aed: 2100000,
            bedrooms: 2,
            bathrooms: 3,
            sqft: 1650,
            community: 'Downtown Dubai'
          },
          {
            id: '2',
            title: q ? `${q} at Dubai Marina` : 'Marina waterfront 1BR',
            price_aed: 1600000,
            bedrooms: 1,
            bathrooms: 1,
            sqft: 820,
            community: 'Dubai Marina'
          }
        ]
      })
    });
  });

  await page.goto('/search');
  await expect(page.getByRole('heading', { name: 'Dubai Property Search' })).toBeVisible();

  const searchButton = page.getByRole('button', { name: 'Search' });
  await expect(searchButton).toBeEnabled();

  await page.getByLabel('Keywords').fill('Marina');
  await searchButton.click();

  const listings = page.locator('article');
  await expect(listings).toHaveCount(2);
  await expect(listings.nth(1)).toContainText('Marina');
});
