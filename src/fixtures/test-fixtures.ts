import { test as base, expect } from '@playwright/test';
import { PageManager } from '../pages/PageManager';

export interface Credentials {
  username: string;
  password: string;
}

interface Fixtures {
  /** Admin credentials, sourced from env vars (ADMIN_USERNAME/ADMIN_PASSWORD) with
   *  the public demo's published defaults as a fallback. Centralising this in a
   *  fixture means no spec ever hardcodes a password inline, and swapping
   *  environments is a .env change, not a find-and-replace across specs. */
  credentials: Credentials;

  /** A PageManager bound to this test's `page`, with no login performed. */
  pageManager: PageManager;

  /** A PageManager for a `page` that is already logged in as the fixture's credentials. */
  loggedInPageManager: PageManager;
}

export const test = base.extend<Fixtures>({
  credentials: async ({}, use) => {
    await use({
      username: process.env.ADMIN_USERNAME ?? 'Admin',
      password: process.env.ADMIN_PASSWORD ?? 'admin123',
    });
  },

  pageManager: async ({ page }, use) => {
    await use(new PageManager(page));
  },

  loggedInPageManager: async ({ page, credentials }, use) => {
    const pageManager = new PageManager(page);
    await pageManager.loginPage().goto();
    await pageManager.loginPage().login(credentials.username, credentials.password);
    await use(pageManager);
  },
});

export { expect };
