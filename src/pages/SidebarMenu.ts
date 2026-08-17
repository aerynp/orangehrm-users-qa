import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * The left-hand main navigation, present on every authenticated page.
 * Kept separate from SystemUsersPage because it's reused by any flow that
 * needs to move between top-level modules (Admin, PIM, Leave, ...).
 */
export class SidebarMenu extends BasePage {
  private readonly adminMenuItem: Locator;

  constructor(page: Page) {
    super(page);
    this.adminMenuItem = page.getByRole('link', { name: 'Admin' });
  }

  /** Navigates Admin -> User Management -> Users via the real UI (not a direct goto). */
  async goToAdminUsers(): Promise<void> {
    await this.adminMenuItem.click();
    await this.page.waitForURL(/\/admin\/viewSystemUsers/, { timeout: 15_000 });
  }
}
