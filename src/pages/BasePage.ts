import { Locator, Page } from '@playwright/test';

/**
 * Common behaviour shared by every page object.
 *
 * The one non-obvious helper here is `waitForLoadingToFinish`. OrangeHRM's
 * "oxd" UI kit shows a spinner overlay while it fetches/saves table data.
 * Clicking through that overlay (or asserting against the table while it is
 * still repainting) is the single biggest source of flakiness in this app,
 * so every action that triggers a network round trip (search, save, delete)
 * routes through this helper instead of a fixed `waitForTimeout`.
 */
export abstract class BasePage {
  protected readonly page: Page;

  protected constructor(page: Page) {
    this.page = page;
  }

  /**
   * Waits out OrangeHRM's loading spinner, if one appears.
   * Some interactions resolve faster than the spinner can even render, so we
   * don't fail if it's never seen - we only block until it's gone if it is.
   */
  protected async waitForLoadingToFinish(): Promise<void> {
    const spinner = this.page.locator('.oxd-loading-spinner, .oxd-form-loader');
    const appeared = await spinner
      .first()
      .waitFor({ state: 'visible', timeout: 2_000 })
      .then(() => true)
      .catch(() => false);

    if (appeared) {
      await spinner.first().waitFor({ state: 'hidden', timeout: 15_000 });
    }
  }

  /** Waits for a toast (success/error notification) and returns its locator. */
  protected toast(): Locator {
    return this.page.locator('.oxd-toast');
  }

  async expectToastToContain(text: string | RegExp): Promise<void> {
    const toast = this.toast().filter({ hasText: text });
    await toast.waitFor({ state: 'visible', timeout: 10_000 });
  }
}
