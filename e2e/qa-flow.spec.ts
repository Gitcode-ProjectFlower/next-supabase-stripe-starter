import { expect, test } from '@playwright/test';

/**
 * E2E Test: Q&A Ask run flow
 * Covers opening a selection, launching the Q&A modal, submitting a prompt,
 * and navigating to the Q&A session page (mocked network response).
 */

test.describe('Q&A Ask flow', () => {
  test('should start Q&A job and navigate to QA session', async ({ page }) => {
    // Mock the QA start endpoint to avoid backend dependency
    await page.route('**/api/selections/demo/qa', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ qaSessionId: 'demo-qa-1' }),
      });
    });

    // Go to demo selection detail (uses local demo data)
    await page.goto('/selections/demo');
    await expect(page).toHaveURL('/selections/demo');

    // Open Q&A modal
    const askButton = page.getByRole('button', { name: /ask q&a/i }).first();
    await askButton.click();

    // Fill prompt
    const promptArea = page
      .getByPlaceholder(/experience|question/i)
      .or(page.getByRole('textbox'))
      .first();
    await promptArea.fill('What is your experience with React and team leadership?');

    // Submit
    const submitButton = page.getByRole('button', { name: /generate answers/i }).first();
    await submitButton.click();

    // Expect navigation to QA session page
    await expect(page).toHaveURL(/\/selections\/demo\/qa\/demo-qa-1$/);

    // Basic smoke on QA page content
    await expect(page.locator('body')).toBeVisible();
  });
});
