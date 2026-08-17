import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin > User Management > Users (viewSystemUsers).
 *
 * Covers the list/search/filter/edit-entry/delete surface. The Add/Edit
 * *form* itself lives in SystemUserFormPage since it's a materially
 * different screen with its own lifecycle - keeping them separate avoids a
 * "god object" page class that knows about two screens at once.
 */
export class SystemUsersListPage extends BasePage {
  private readonly pageHeading: Locator;
  private readonly addButton: Locator;
  private readonly searchButton: Locator;
  private readonly resetButton: Locator;
  private readonly usernameFilterInput: Locator;
  private readonly recordsFoundText: Locator;
  private readonly noRecordsText: Locator;
  private readonly table: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.getByRole('heading', { name: 'System Users' });
    this.addButton = page.getByRole('button', { name: 'Add' });
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resetButton = page.getByRole('button', { name: 'Reset' });
    this.table = page.locator('.oxd-table');
    this.recordsFoundText = page.getByText(/Records Found/);
    // OrangeHRM also fires an info *toast* with this same text after a
    // no-results search, and it isn't actually nested inside .oxd-table (a
    // container-scoped locator finds nothing at all), so instead we
    // disambiguate by tag: the table's own message renders as a <span>,
    // while the toast's copy renders as a <p class="...toast-message...">.
    // Scoping to the tag reliably excludes the toast without depending on
    // table containment.
    this.noRecordsText = page.locator('span').filter({ hasText: 'No Records Found' });

    // The filter panel's oxd form groups don't wire a real `for`/`id` pair
    // between <label> and <input>, so getByLabel() can't find them. Scoping
    // to the group whose *label child* has this exact text is the
    // next-most-robust option available without a data-testid (see
    // NOTES.md) - matching on the group's overall text content instead
    // would be thrown off by incidental whitespace/text from sibling
    // elements inside the same group.
    this.usernameFilterInput = page
      .locator('.oxd-table-filter-area .oxd-input-group')
      .filter({ has: page.locator('label', { hasText: /^Username$/ }) })
      .locator('input');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/admin/viewSystemUsers');
    await expect(this.pageHeading).toBeVisible();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.pageHeading).toBeVisible();
  }

  async clickAdd(): Promise<void> {
    await this.addButton.click();
  }

  /** Filters the grid by username and waits for the table to settle. */
  async filterByUsername(username: string): Promise<void> {
    await this.usernameFilterInput.fill(username);
    await this.searchButton.click();
    await this.waitForLoadingToFinish();
  }

  async resetFilters(): Promise<void> {
    await this.resetButton.click();
    await this.waitForLoadingToFinish();
  }

  /** Row for a given username, matched by its accessible (text) content. */
  row(username: string): Locator {
    return this.table.getByRole('row', { name: username });
  }

  async expectUserVisible(username: string): Promise<void> {
    await expect(this.row(username)).toBeVisible();
  }

  async expectUserNotPresent(username: string): Promise<void> {
    // After filtering by a username that no longer exists, OrangeHRM shows
    // an explicit "No Records Found" state rather than an empty table.
    await expect(this.noRecordsText).toBeVisible();
    await expect(this.row(username)).toHaveCount(0);
  }

  async expectRecordsFoundVisible(): Promise<void> {
    await expect(this.recordsFoundText).toBeVisible();
  }

  /**
   * Clicks the edit (pencil) icon on the row for `username` and waits for
   * the Edit form's own loading indicator to fully clear before returning,
   * so callers can start filling in fields on a form that's actually ready
   * rather than one still mid-fetch of the user's existing data.
   */
  async editUser(username: string): Promise<void> {
    const targetRow = this.row(username);
    await targetRow.locator('.oxd-icon.bi-pencil-fill, [class*="pencil"]').first().click();
    await this.page.waitForURL(/\/admin\/(saveSystemUser|editSystemUser)/, { timeout: 15_000 });
    await this.waitForLoadingToFinish();
  }

  /** Clicks the delete (trash) icon on the row and confirms the modal. */
  async deleteUser(username: string): Promise<void> {
    const targetRow = this.row(username);
    await targetRow.locator('.oxd-icon.bi-trash, [class*="trash"]').first().click();

    const confirmButton = this.page.getByRole('button', { name: 'Yes, Delete' });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await this.expectToastToContain(/Success/i);
    await this.waitForLoadingToFinish();
  }
}
