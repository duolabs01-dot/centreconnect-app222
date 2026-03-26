import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3010';

test.describe('Comprehensive Parent Profile Completion System', () => {
  test('Complete multi-step onboarding with validation and draft saving', async ({ page }) => {
    console.log('🚀 Starting Parent Profile System Test');

    const timestamp = Date.now();
    const email = `audit_parent_${timestamp}@example.com`;
    const password = process.env.TEST_USER_PASSWORD ?? ''

    // 1. Setup: Register and get to onboarding
    await page.goto(`${BASE_URL}/register`);
    await page.fill('input[id="firstName"]', 'Audit');
    await page.fill('input[id="surname"]', `Parent_${timestamp}`);
    await page.fill('input[id="email"]', email);
    await page.fill('input[id="phone"]', '0123456789');
    await page.fill('input[id="password"]', password);
    await page.fill('input[id="confirmPassword"]', password);
    await page.check('input[id="acceptTerms"]');
    await page.click('button[type="submit"]');

    // Assume auto-confirm or dev environment bypass for now
    await expect(page).toHaveURL(/.*onboarding/, { timeout: 30000 });
    console.log('✅ Landed on onboarding page');

    // 2. Step 1: Parent Info - Test Validation
    console.log('📝 Testing Step 1 Validation...');
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=Full name is required')).toBeVisible();
    await expect(page.locator('text=Phone number is required')).toBeVisible();
    
    // Fill Step 1
    await page.fill('input[placeholder="Enter your name"]', 'Audit Parent');
    await page.fill('input[placeholder="e.g. 082 123 4567"]', '0829998888');
    await page.click('button:has-text("Mother")');
    await page.click('button:has-text("Continue")');
    console.log('✅ Step 1 Completed');

    // 3. Step 2: Child Info - Test Draft Saving
    console.log('📝 Testing Step 2 & Draft Saving...');
    await page.fill('input[placeholder="Name"]', 'Audit Baby');
    await page.fill('input[placeholder="Surname"]', 'Test');
    await page.fill('input[type="date"]', '2023-01-01');
    
    // Refresh page to simulate interruption/draft reload
    await page.reload();
    await expect(page.locator('input[placeholder="Name"]')).toHaveValue('Audit Baby');
    console.log('✅ Draft reloading verified');
    
    await page.click('button:has-text("Continue")');
    console.log('✅ Step 2 Completed');

    // 4. Step 3: Emergency Info
    console.log('📝 Testing Step 3...');
    await page.fill('input[placeholder="Full name"]', 'Emergency Contact');
    await page.fill('input[placeholder="Phone number"]', '0831112222');
    await page.click('button:has-text("Continue")');
    console.log('✅ Step 3 Completed');

    // 5. Step 4: Preferences & Completion
    console.log('📝 Testing Step 4 & Completion...');
    await page.selectOption('select', 'Sandton');
    
    // Simulate offline state if possible (Playwright can do this)
    await page.context().setOffline(true);
    await page.click('button:has-text("Start Exploring")');
    await expect(page.locator('text=You need to be online')).toBeVisible();
    console.log('✅ Offline prevention verified');
    
    await page.context().setOffline(false);
    await page.click('button:has-text("Start Exploring")');
    
    // Final redirect
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 30000 });
    console.log('✅ Full onboarding flow completed successfully');
  });
});
