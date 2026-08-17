import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export type UserRole = 'Admin' | 'ESS';

/**
 * The Add User / Edit User form (same screen, same routes family, just a
 * different heading and pre-filled state). Kept as one page object because
 * the two modes share ~100% of their locators and behaviour.
 */
export class SystemUserFormPage extends BasePage {
  private readonly saveButton: Locator;
  private readonly cancelButton: Locator;
  private readonly requiredFieldErrors: Locator;

  constructor(page: Page) {
    super(page);
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.cancelButton = page.getByRole('button', { name: 'Cancel' });
    this.requiredFieldErrors = page.locator('.oxd-input-field-error-message');
  }

  /**
   * Scopes to the labeled field group. See NOTES.md for why this pattern is used
   * instead of getByLabel() - the oxd form kit doesn't associate label/input via
   * for/id, so getByLabel can't resolve them.
   *
   * Filtering on the group's *own* text (`.oxd-input-group', { hasText })`)
   * is tempting but fragile: the group's textContent also picks up
   * whitespace/text from sibling children (error messages, dropdown option
   * lists, etc.), which breaks an exact/anchored match. Scoping via `has:`
   * to the specific <label> descendant avoids that, and the exact regex
   * guards against substring collisions, e.g. "Password" matching inside
   * "Confirm Password".
   */
  private fieldGroup(labelText: string): Locator {
    return this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.locator('label', { hasText: new RegExp(`^${labelText}$`) }) });
  }

  async expectLoaded(mode: 'Add' | 'Edit'): Promise<void> {
    await expect(this.page.getByRole('heading', { name: `${mode} User` })).toBeVisible();
  }

  async selectUserRole(role: UserRole): Promise<void> {
    await this.fieldGroup('User Role').locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: role, exact: true }).click();
  }

  /**
   * Sets the Status *dropdown* on the Add form. Unlike Edit (where Status is
   * a toggle switch - see setStatus() below), Add renders Status as a
   * "-- Select --" dropdown, so it needs its own required selection here.
   */
  async selectStatus(value: 'Enabled' | 'Disabled'): Promise<void> {
    await this.fieldGroup('Status').locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: value, exact: true }).click();
  }

  /**
   * Types into the Employee Name autocomplete and picks the first suggestion.
   * This is the one field the task brief flags as potentially unstable (the
   * demo's employee list is shared/shifting), so callers in the happy-path
   * spec use a broad, near-guaranteed-to-match search term, and the *edit*
   * step deliberately avoids touching this field again.
   *
   * Three explicit stages, in order:
   *   1. Wait for the dropdown itself to expand after typing.
   *   2. Wait out the "Searching..." label, if it appears - clicking before
   *      it clears risks grabbing a stale/loading item instead of a real
   *      result. Same tolerant appear-then-hidden pattern as
   *      BasePage.waitForLoadingToFinish(): don't fail if the query resolves
   *      too fast for the label to ever render.
   *   3. Only then wait for and click the first real suggestion.
   */
  async selectEmployee(searchTerm: string): Promise<void> {
    const input = this.fieldGroup('Employee Name').locator('input');
    await input.fill(searchTerm);

    // 1. Wait for the dropdown to expand.
    const dropdown = this.page.locator('.oxd-autocomplete-dropdown');
    await dropdown.waitFor({ state: 'visible', timeout: 10_000 });

    // 2. Wait out the "Searching..." label, if it appears.
    const searchingLabel = this.page.getByText('Searching...');
    const searchingAppeared = await searchingLabel
      .waitFor({ state: 'visible', timeout: 2_000 })
      .then(() => true)
      .catch(() => false);
    if (searchingAppeared) {
      await searchingLabel.waitFor({ state: 'hidden', timeout: 10_000 });
    }

    // 3. Choose the first real suggestion.
    const suggestion = this.page
      .locator('.oxd-autocomplete-dropdown [role="option"], .oxd-autocomplete-option-item')
      .first();
    await suggestion.waitFor({ state: 'visible', timeout: 10_000 });
    await suggestion.click();
  }

  async fillUsername(username: string): Promise<void> {
    await this.fieldGroup('Username').locator('input').fill(username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.fieldGroup('Password').locator('input').fill(password);
    await this.fieldGroup('Confirm Password').locator('input').fill(password);
  }

  /** Reads whether the Status switch is currently "Enabled". */
  private statusSwitch(): Locator {
    return this.fieldGroup('Status').locator('.oxd-switch-input');
  }

  async isEnabled(): Promise<boolean> {
    return this.statusSwitch().evaluate((el) => el.classList.contains('oxd-switch-input--active'));
  }

  /** Sets Status to the desired value, only clicking the toggle if it's currently different. */
  async setStatus(enabled: boolean): Promise<void> {
    const currentlyEnabled = await this.isEnabled();
    if (currentlyEnabled !== enabled) {
      await this.statusSwitch().click();
    }
  }

  /**
   * Deliberately does *not* wait out the loading spinner here. Traced this on
   * a real failure: the success toast appears the moment the save request
   * resolves and auto-dismisses on a short timer, while the spinner-hidden
   * wait alone was taking 3.5+s on this shared, sometimes-slow demo instance.
   * Sequencing the toast-check after that wait meant it started checking
   * *after* the toast's own display window could already have elapsed - a
   * clean 10s timeout with the toast never once observed. Letting
   * expectSavedSuccessfully() check for the toast immediately, with no
   * spinner-wait in between, gives it the best chance of catching it while
   * it's actually up. Validation-failure callers (expectRequiredFieldValidation)
   * never triggered a network round trip in the first place, so there's no
   * spinner to wait for there either.
   */
  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async expectSavedSuccessfully(): Promise<void> {
    await this.expectToastToContain(/Success/i);
    await this.page.waitForURL(/\/admin\/viewSystemUsers/, { timeout: 15_000 });
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.page.waitForURL(/\/admin\/viewSystemUsers/, { timeout: 15_000 });
  }

  /** For the negative case: save with required fields empty and assert inline validation. */
  async expectRequiredFieldValidation(): Promise<void> {
    await expect(this.requiredFieldErrors.first()).toBeVisible();
    await expect(this.requiredFieldErrors.first()).toContainText(/Required/i);
  }
}
