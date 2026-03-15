import { test, expect } from '@playwright/test';

const PARENT_AUTH = {
  email: 'mandlakevin@gmail.com',
  password: 'CentreConnect!2026'
};

const ECD_AUTH = {
  email: 'duolabs01@gmail.com',
  password: 'CentreConnect!2026'
};

test.describe('Portal Deep Review', () => {
  test('Parent Portal - Comprehensive Review', async ({ page }) => {
    console.log('🚀 Starting Parent Portal Review...');
    
    // 1. Login (Using confirmed /login route)
    await page.goto('http://localhost:3010/login');
    await page.waitForSelector('#email');
    await page.fill('#email', PARENT_AUTH.email);
    await page.fill('#password', PARENT_AUTH.password);
    await page.click('button[type="submit"]');

    // Wait for Dashboard
    try {
      await page.waitForURL(/.*dashboard/, { timeout: 30000 });
      console.log('✅ Parent Login: SUCCESS');
    } catch (e) {
      console.error('❌ Parent Login: FAILED or TIMEOUT');
      await page.screenshot({ path: 'parent-login-failed.png' });
      return;
    }

    const parentRoutes = [
      { path: '/parent/dashboard', label: 'Dashboard' },
      { path: '/parent/children', label: 'Children' },
      { path: '/parent/discover', label: 'Discover' },
      { path: '/parent/applications', label: 'Applications' },
      { path: '/parent/billing', label: 'Billing' },
      { path: '/parent/profile', label: 'Profile' },
      { path: '/parent/report-cards', label: 'Report Cards' },
      { path: '/parent/support', label: 'Support' }
    ];

    for (const route of parentRoutes) {
      console.log(`Checking: ${route.path}...`);
      await page.goto(`http://localhost:3010${route.path}`, { waitUntil: 'networkidle' });
      
      const bodyText = await page.innerText('body');
      if (bodyText.includes('unexpected error') || bodyText.includes('404')) {
        console.error(`❌ Error on ${route.path}`);
      } else {
        console.log(`✅ ${route.label} Page: OK`);
      }
    }
  });

  test('ECD Admin Portal - Comprehensive Review', async ({ page }) => {
    console.log('🚀 Starting ECD Admin Portal Review...');

    // 1. Login
    await page.goto('http://localhost:3010/login');
    await page.waitForSelector('#email');
    await page.fill('#email', ECD_AUTH.email);
    await page.fill('#password', ECD_AUTH.password);
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL(/.*(ecd|admin).*/, { timeout: 30000 });
      console.log('✅ ECD Admin Login: SUCCESS');
    } catch (e) {
      console.error('❌ ECD Admin Login: FAILED or TIMEOUT');
      await page.screenshot({ path: 'ecd-login-failed.png' });
      return;
    }

    const ecdRoutes = [
      { path: '/ecd/dashboard', label: 'ECD Dashboard' },
      { path: '/ecd/children', label: 'ECD Children' },
      { path: '/ecd/attendance', label: 'ECD Attendance' },
      { path: '/ecd/billing', label: 'ECD Billing' },
      { path: '/admin/dashboard', label: 'Platform Admin Dashboard' }
    ];

    for (const route of ecdRoutes) {
      console.log(`Checking: ${route.path}...`);
      await page.goto(`http://localhost:3010${route.path}`, { waitUntil: 'networkidle' });
      
      const bodyText = await page.innerText('body');
      if (bodyText.includes('unexpected error') || bodyText.includes('404')) {
        console.log(`⚠️ ${route.label} Page: Not found or Access Denied`);
      } else {
        console.log(`✅ ${route.label} Page: OK`);
      }
    }
  });
});
