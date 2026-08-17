import { test } from '../src/fixtures/test-fixtures';
import { uniqueUsername } from '../src/utils/testData';

test.describe('System Users - negative paths', () => {
  test('@regression rejects login with invalid credentials', async ({ pageManager }) => {
    const loginPage = pageManager.loginPage();
    await loginPage.goto();
    await loginPage.attemptLogin('invalid_user_does_not_exist', 'wrong-password-123');
    await loginPage.expectInvalidCredentialsError();
  });

  test('@regression filtering by a username that does not exist shows no results', async ({
    loggedInPageManager,
  }) => {
    const usersList = loggedInPageManager.systemUsersListPage();
    const missingUsername = uniqueUsername('does_not_exist');

    await loggedInPageManager.sidebarMenu().goToAdminUsers();
    await usersList.expectLoaded();
    await usersList.filterByUsername(missingUsername);
    await usersList.expectUserNotPresent(missingUsername);
  });

  test('@regression creating a user with required fields empty is blocked with inline validation', async ({
    loggedInPageManager,
  }) => {
    const usersList = loggedInPageManager.systemUsersListPage();
    const userForm = loggedInPageManager.systemUserFormPage();

    await loggedInPageManager.sidebarMenu().goToAdminUsers();
    await usersList.clickAdd();
    await userForm.expectLoaded('Add');

    // Submit with nothing filled in at all.
    await userForm.save();
    await userForm.expectRequiredFieldValidation();

    // And we should still be on the Add form, not navigated away.
    await userForm.expectLoaded('Add');
  });
});
