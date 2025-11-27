// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Homepage', () => {
  test('has correct title', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page has the expected SEO-optimized title
    await expect(page).toHaveTitle(/Eventplanung.*Vermietung.*Chemnitz.*BANKetTISCH/);
  });

  test('has impressum link in navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check that impressum link is present in the header navigation
    const impressumLink = page.locator('header nav a[href="impressum.html"]');
    await expect(impressumLink).toBeVisible();
    await expect(impressumLink).toHaveText('Impressum');
  });

  test('has feature list element', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Check that feature-list is attached to the DOM
    const featureList = page.locator('.feature-list');
    await expect(featureList).toBeAttached();
  });

  test('displays footer with current year', async ({ page }) => {
    await page.goto('/');
    
    const currentYear = new Date().getFullYear().toString();
    const footerYear = page.locator('#footer-year');
    await expect(footerYear).toHaveText(currentYear);
  });

  test('has whatsapp contact button', async ({ page }) => {
    await page.goto('/');
    
    const whatsappBtn = page.locator('a.whatsapp-btn');
    await expect(whatsappBtn).toBeVisible();
    await expect(whatsappBtn).toHaveAttribute('href', /wa\.me/);
  });
});

test.describe('Navigation', () => {
  test('can navigate to produkte page', async ({ page }) => {
    await page.goto('/');
    
    await page.click('nav a[href="produkte.html"]');
    await expect(page).toHaveURL(/produkte\.html/);
  });

  test('can navigate to kontakt page', async ({ page }) => {
    await page.goto('/');
    
    await page.click('nav a[href="kontakt.html"]');
    await expect(page).toHaveURL(/kontakt\.html/);
  });

  test('can navigate to impressum page', async ({ page }) => {
    await page.goto('/');
    
    await page.click('nav a[href="impressum.html"]');
    await expect(page).toHaveURL(/impressum\.html/);
  });
});
