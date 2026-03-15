import { test, expect } from '@playwright/test';

test('homepage loads and shows title', async ({ page }) => {
  // Go to the local dev server
  await page.goto('http://localhost:3010');

  // Verify the page title or a known piece of text
  // Since I don't know the exact title, I'll look for "CentreConnect" or common elements
  await expect(page).toHaveTitle(/CentreConnect/i);
});
