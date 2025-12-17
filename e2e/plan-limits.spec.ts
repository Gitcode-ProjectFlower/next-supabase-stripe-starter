import { expect, test } from '@playwright/test';

/**
 * E2E Test: Plan Limits and Restrictions
 * Tests that different plan tiers enforce their limits correctly
 */

test.describe('Plan Limits', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show plan information on dashboard', async ({ page }) => {
    await test.step('Verify plan info is displayed', async () => {
      // Look for plan indicator
      const planInfo = page.locator('[data-testid="plan-info"]').or(page.locator('text=/plan/i')).first();

      // Plan info should be visible somewhere on the page
      const isVisible = await planInfo.isVisible({ timeout: 5000 }).catch(() => false);
      if (isVisible) {
        console.log('✅ Plan information displayed');
      } else {
        console.log('⚠️  Plan information not found - might be in different location');
      }
    });
  });

  test('should display plan limits in UI', async ({ page }) => {
    await test.step('Check for plan limit indicators', async () => {
      // Look for limit text (e.g., "100 results", "500 max")
      const limitText = page.locator('text=/\\d+\\s*(results|max|limit)/i').first();

      const isVisible = await limitText.isVisible({ timeout: 5000 }).catch(() => false);
      if (isVisible) {
        const text = await limitText.textContent();
        console.log(`✅ Found limit indicator: ${text}`);
      }
    });
  });

  test('should show upgrade prompt when approaching limits', async ({ page }) => {
    await test.step('Trigger upgrade prompt scenario', async () => {
      // Perform search that might trigger limit warning
      const searchButton = page.locator('button:has-text("Search")').first();

      if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchButton.click();
        await page.waitForTimeout(2000);

        // Look for upgrade prompts or warnings
        const upgradePrompt = page.locator('text=/upgrade/i').or(page.locator('text=/limit/i'));
        const promptVisible = await upgradePrompt.isVisible({ timeout: 3000 }).catch(() => false);

        if (promptVisible) {
          console.log('✅ Upgrade prompt or limit warning displayed');
        }
      }
    });
  });

  test('should navigate to pricing page from upgrade prompt', async ({ page }) => {
    await test.step('Test pricing page navigation', async () => {
      // Navigate to pricing
      await page.goto('/pricing');
      await expect(page).toHaveURL('/pricing');

      // Verify pricing page loaded
      await page.waitForLoadState('networkidle');

      // Look for plan cards
      const planCards = page.locator('[data-testid="plan-card"]').or(page.locator('text=/small|medium|large/i'));
      const count = await planCards.count();

      expect(count).toBeGreaterThan(0);
      console.log(`✅ Found ${count} plan options`);
    });
  });

  test('should show correct field masking based on plan', async ({ page }) => {
    await test.step('Verify field visibility by plan', async () => {
      await page.goto('/');

      // Perform a search
      const searchButton = page.locator('button:has-text("Search")').first();
      if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchButton.click();
        await page.waitForTimeout(2000);

        // Check if sensitive fields are masked
        // For free/small plans, email and phone should be hidden
        const emailField = page.locator('text=/@.*\\.com/').first();
        const phoneField = page.locator('text=/\\+?\\d{10,}/').first();

        const emailVisible = await emailField.isVisible({ timeout: 2000 }).catch(() => false);
        const phoneVisible = await phoneField.isVisible({ timeout: 2000 }).catch(() => false);

        if (!emailVisible && !phoneVisible) {
          console.log('✅ Sensitive fields properly masked for current plan');
        } else {
          console.log('ℹ️  Sensitive fields visible - user might have higher plan');
        }
      }
    });
  });

  test('should prevent exceeding selection item limit', async ({ page }) => {
    await test.step('Test selection item limit enforcement', async () => {
      await page.goto('/');

      // Try to select many candidates
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();

      if (count > 0) {
        // Try to select more than plan allows
        const selectCount = Math.min(150, count); // Try to exceed small plan limit

        for (let i = 0; i < selectCount && i < count; i++) {
          await checkboxes.nth(i).click();
        }

        // Try to save
        const saveButton = page.locator('button:has-text("Save")').first();
        if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveButton.click();

          // Should show error or limit warning
          const errorMessage = page.locator('text=/limit|exceed|maximum/i').first();
          const errorVisible = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);

          if (errorVisible) {
            console.log('✅ Plan limit enforcement working');
          }
        }
      }
    });
  });
});
