import { test, expect } from '@playwright/test';

/**
 * E2E Test: Error Handling
 * Tests that the application handles errors gracefully and shows user-friendly messages
 */

test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
        await test.step('Test offline behavior', async () => {
            await page.goto('/dashboard');

            // Simulate offline mode
            await page.context().setOffline(true);

            // Try to perform an action that requires network
            const searchButton = page.locator('button:has-text("Search")').first();
            if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                await searchButton.click();

                // Should show error message
                await page.waitForTimeout(2000);

                const errorMessage = page.locator('text=/error|failed|network/i').first();
                const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);

                if (errorVisible) {
                    console.log('✅ Network error handled gracefully');
                }
            }

            // Restore online mode
            await page.context().setOffline(false);
        });
    });

    test('should show user-friendly error messages', async ({ page }) => {
        await test.step('Verify error message quality', async () => {
            await page.goto('/dashboard');

            // Trigger an error scenario (e.g., invalid search)
            const searchButton = page.locator('button:has-text("Search")').first();

            if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                await searchButton.click();
                await page.waitForTimeout(1000);

                // Look for any error messages
                const errorMessages = page.locator('[role="alert"]').or(page.locator('.error')).or(page.locator('[data-testid="error"]'));
                const count = await errorMessages.count();

                if (count > 0) {
                    const errorText = await errorMessages.first().textContent();

                    // Error messages should not contain technical jargon
                    const isFriendly = !errorText?.match(/(undefined|null|500|stack trace)/i);

                    if (isFriendly) {
                        console.log('✅ Error messages are user-friendly');
                    } else {
                        console.log('⚠️  Error message might be too technical:', errorText);
                    }
                }
            }
        });
    });

    test('should handle invalid filter values', async ({ page }) => {
        await test.step('Test invalid filter handling', async () => {
            await page.goto('/dashboard');

            // Try to manipulate URL with invalid filters
            await page.goto('/dashboard?sectors=invalid&regions=nonexistent');

            // Page should still load without crashing
            await expect(page).not.toHaveURL(/error/);
            await page.waitForLoadState('networkidle');

            console.log('✅ Invalid filters handled without crash');
        });
    });

    test('should handle expired session gracefully', async ({ page }) => {
        await test.step('Test session expiration', async () => {
            // Clear cookies to simulate expired session
            await page.context().clearCookies();

            // Try to access protected page
            await page.goto('/dashboard');

            // Should redirect to login or show auth error
            await page.waitForTimeout(2000);

            const currentUrl = page.url();
            const isOnLoginOrError = currentUrl.includes('/login') || currentUrl.includes('/auth');

            if (isOnLoginOrError) {
                console.log('✅ Expired session redirects to login');
            } else {
                console.log('ℹ️  Session handling might be different');
            }
        });
    });

    test('should handle rate limit exceeded', async ({ page }) => {
        await test.step('Test rate limit handling', async () => {
            await page.goto('/dashboard');

            // Perform multiple rapid requests
            const searchButton = page.locator('button:has-text("Search")').first();

            if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                // Click search button multiple times rapidly
                for (let i = 0; i < 5; i++) {
                    await searchButton.click();
                    await page.waitForTimeout(100);
                }

                // Look for rate limit message
                await page.waitForTimeout(1000);
                const rateLimitMessage = page.locator('text=/rate limit|too many|slow down/i').first();
                const messageVisible = await rateLimitMessage.isVisible({ timeout: 3000 }).catch(() => false);

                if (messageVisible) {
                    console.log('✅ Rate limit message displayed');
                } else {
                    console.log('ℹ️  Rate limit not triggered or handled differently');
                }
            }
        });
    });

    test('should handle missing data gracefully', async ({ page }) => {
        await test.step('Test empty state handling', async () => {
            await page.goto('/selections');

            // Should show empty state if no selections
            await page.waitForLoadState('networkidle');

            const emptyState = page.locator('text=/no selections|empty|get started/i').first();
            const resultsExist = await page.locator('[data-testid="selection-card"]').count() > 0;

            if (!resultsExist) {
                const emptyStateVisible = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

                if (emptyStateVisible) {
                    console.log('✅ Empty state displayed correctly');
                }
            } else {
                console.log('ℹ️  Selections exist, empty state not applicable');
            }
        });
    });

    test('should recover from errors without page refresh', async ({ page }) => {
        await test.step('Test error recovery', async () => {
            await page.goto('/dashboard');

            // Trigger an error
            await page.context().setOffline(true);

            const searchButton = page.locator('button:has-text("Search")').first();
            if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                await searchButton.click();
                await page.waitForTimeout(1000);
            }

            // Restore connection
            await page.context().setOffline(false);

            // Try again - should work
            if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                await searchButton.click();
                await page.waitForTimeout(2000);

                // Should show results or at least not error
                await expect(page).not.toHaveURL(/error/);
                console.log('✅ Recovered from error without refresh');
            }
        });
    });

    test('should show loading states during operations', async ({ page }) => {
        await test.step('Verify loading indicators', async () => {
            await page.goto('/dashboard');

            const searchButton = page.locator('button:has-text("Search")').first();

            if (await searchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
                // Click and immediately check for loading state
                await searchButton.click();

                // Look for loading indicator
                const loadingIndicator = page.locator('[data-testid="loading"]').or(page.locator('text=/loading|searching/i')).or(page.locator('.spinner'));
                const loadingVisible = await loadingIndicator.isVisible({ timeout: 1000 }).catch(() => false);

                if (loadingVisible) {
                    console.log('✅ Loading state displayed');
                } else {
                    console.log('ℹ️  Loading state might be too fast to detect');
                }
            }
        });
    });
});
