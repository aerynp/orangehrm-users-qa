import { Page } from '@playwright/test';
import { LoginPage } from './LoginPage';
import { SidebarMenu } from './SidebarMenu';
import { SystemUsersListPage } from './SystemUsersListPage';
import { SystemUserFormPage } from './SystemUserFormPage';

/**
 * Small factory that hands out page objects for a given `page`.
 *
 * Specs shouldn't be responsible for wiring up `new SomePage(page)` for
 * every screen they touch - that's plumbing, not test intent. Everything is
 * lazily instantiated (created once, on first access) so we're not paying
 * for page objects a given test never uses.
 */
export class PageManager {
  private readonly page: Page;

  private _loginPage?: LoginPage;
  private _sidebarMenu?: SidebarMenu;
  private _systemUsersListPage?: SystemUsersListPage;
  private _systemUserFormPage?: SystemUserFormPage;

  constructor(page: Page) {
    this.page = page;
  }

  loginPage(): LoginPage {
    return (this._loginPage ??= new LoginPage(this.page));
  }

  sidebarMenu(): SidebarMenu {
    return (this._sidebarMenu ??= new SidebarMenu(this.page));
  }

  systemUsersListPage(): SystemUsersListPage {
    return (this._systemUsersListPage ??= new SystemUsersListPage(this.page));
  }

  systemUserFormPage(): SystemUserFormPage {
    return (this._systemUserFormPage ??= new SystemUserFormPage(this.page));
  }
}
