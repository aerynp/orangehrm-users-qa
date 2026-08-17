import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByPlaceholder('Username');
    this.passwordInput = page.getByPlaceholder('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    // OrangeHRM renders both field-level and form-level errors with this class.
    this.errorAlert = page.locator('.oxd-alert-content-text');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/auth/login');
    await expect(this.usernameInput).toBeVisible();
  }

  /** Logs in and waits for the post-login dashboard to be ready. */
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
    // Successful login lands on /dashboard - wait on the URL rather than a
    // sleep so we don't race the SPA's client-side redirect.
    await this.page.waitForURL(/\/dashboard\/index/, { timeout: 15_000 });
  }

  /** Attempts login without asserting success - used by negative-path tests. */
  async attemptLogin(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectInvalidCredentialsError(): Promise<void> {
    await expect(this.errorAlert).toBeVisible();
    await expect(this.errorAlert).toContainText('Invalid credentials');
  }
}
