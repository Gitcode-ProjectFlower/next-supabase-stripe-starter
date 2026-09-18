import { expect, test } from '@playwright/test';

/**
 * E2E regression: Hendrik remarks 16-09 — SPS filtering / follow-up / downloads.
 * Fully mocked network: verifies the UI flow that was broken before the fix:
 *  - filtering SPS scores narrows results and drives the follow-up CTA count
 *  - follow-up CTA creates the new selection and navigates to it
 *  - Download Excel on a run WITH csv_url downloads that run's file
 *    (previously the copied SPS run had no csv_url → "available soon")
 *  - Download Excel on a run WITHOUT csv_url and no exports shows the note
 */

const SEL = 'sel-1';
const SPS_SESSION = 'qa-sps-1';
const NEW_SEL = 'sel-2';

function spsAnswer(docId: string, name: string, score: number) {
  return {
    id: `a-${docId}`,
    doc_id: docId,
    name,
    email: '',
    city: '',
    answer: JSON.stringify({ SCORE_VALUE: score, SCORE_TEXT: `Rationale for ${name}` }),
    status: 'success',
  };
}

const SPS_RESULT = {
  id: SPS_SESSION,
  selection_id: SEL,
  selection_name: 'repro hendrik 6',
  total_items: 6,
  prompt: 'Sales Priority Score',
  standard_question_id: '1',
  input_snapshot: null,
  status: 'completed',
  progress: 100,
  created_at: '2026-09-17T09:20:00.000Z',
  completed_at: '2026-09-17T09:35:00.000Z',
  csv_url: 'https://cdn.test/exports/qa_sps.xlsx',
  answers: [
    spsAnswer('c1', 'TESCO', 3),
    spsAnswer('c2', 'ASDA', 3),
    spsAnswer('c3', 'SAINSBURYS', 4),
    spsAnswer('c4', 'MARKSSPENCER', 3),
    spsAnswer('c5', 'MORRISONS', 5),
    spsAnswer('c6', 'BM', 3),
  ],
};

test.describe('SPS filtering / follow-up / downloads', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.beforeEach(async ({ page }) => {
    await page.route(`**/api/selections/${SEL}/qa/${SPS_SESSION}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SPS_RESULT) });
    });
    await page.route('**/rest/v1/downloads*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
  });

  test('filters 4/5 and creates the follow-up selection', async ({ page }) => {
    let followUpBody: unknown = null;
    await page.route(`**/api/selections/${SEL}/follow-up`, async (route) => {
      followUpBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ newSelectionId: NEW_SEL, itemCount: 2, copiedAnswers: 2 }),
      });
    });
    await page.route(`**/api/selections/${NEW_SEL}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          selection: {
            id: NEW_SEL,
            name: 'repro hendrik 6 – High Priority',
            item_count: 2,
            created_at: new Date().toISOString(),
            expires_at: new Date().toISOString(),
            items: [],
          },
        }),
      });
    });
    await page.route(`**/api/selections/${NEW_SEL}/qa`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sessions: [] }) });
    });

    await page.goto(`/uk/selections/${SEL}/qa/${SPS_SESSION}`);
    await expect(page.getByText('Showing 6 answers')).toBeVisible();

    await page.getByRole('button', { name: '5/' }).click();
    await page.getByRole('button', { name: '4/' }).click();
    await expect(page.getByText('Showing 2 answers')).toBeVisible();

    const cta = page.getByRole('button', { name: /Run follow-up analysis on 2 companies/ });
    await expect(cta).toBeVisible();
    await cta.click();

    await expect(page).toHaveURL(new RegExp(`/uk/selections/${NEW_SEL}$`));
    expect(followUpBody).toMatchObject({ scores: expect.arrayContaining([5, 4]), sourceQaSessionId: SPS_SESSION });
  });

  test('downloads the run Excel file when csv_url exists', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __opened: string[] }).__opened = [];
      const originalOpen = window.open;
      window.open = ((url?: string | URL | null) => {
        (window as unknown as { __opened: string[] }).__opened.push(String(url));
        return originalOpen.call(window, 'about:blank');
      }) as typeof window.open;
    });

    await page.goto(`/uk/selections/${SEL}/qa/${SPS_SESSION}`);
    await expect(page.getByText('Showing 6 answers')).toBeVisible();

    await page.getByRole('button', { name: 'Download this run' }).click();
    const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
    expect(opened).toEqual(['https://cdn.test/exports/qa_sps.xlsx']);
    await expect(page.getByText(/available soon/i)).toHaveCount(0);
  });

  test('shows the note when the run has no Excel and no exports exist', async ({ page }) => {
    await page.route(`**/api/selections/${SEL}/qa/no-file-session`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...SPS_RESULT, id: 'no-file-session', csv_url: null }),
      });
    });

    await page.goto(`/uk/selections/${SEL}/qa/no-file-session`);
    await expect(page.getByText('Showing 6 answers')).toBeVisible();
    await page.getByRole('button', { name: 'Download this run' }).click();
    await expect(page.getByText(/available soon/i)).toBeVisible();
  });
});
