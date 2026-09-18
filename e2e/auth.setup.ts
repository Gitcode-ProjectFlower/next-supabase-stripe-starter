/**
 * Playwright setup: signs the dedicated E2E user in and stores the session
 * (Supabase auth cookies) for reuse across specs via storageState.
 *
 * Requires E2E_TEST_PASSWORD in .env.local (gitignored).
 * Run: npx playwright test --project=setup
 */
import { config as loadEnv } from 'dotenv';
import { test as setup } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';

loadEnv({ path: '.env.local' });

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  const email = 'e2e-regression@example.com';
  const password = process.env.E2E_TEST_PASSWORD;
  if (!password) throw new Error('E2E_TEST_PASSWORD is missing in .env.local');

  const jar = new Map<string, string>();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    {
      cookies: {
        getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
        setAll: (list) => {
          for (const { name, value } of list) jar.set(name, value);
        },
      },
    }
  );
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`E2E sign-in failed: ${error.message}`);

  await page.goto('/uk');
  await page
    .context()
    .addCookies([...jar.entries()].map(([name, value]) => ({ name, value, domain: 'localhost', path: '/' })));
  await page.goto('/uk');
  await page.getByRole('button', { name: 'Logout' }).waitFor({ timeout: 30000 });
  await page.context().storageState({ path: authFile });
});
