import { test } from '../src/fixtures/test-fixtures';
import { uniqueUsername, validPassword } from '../src/utils/testData';

test.describe('System Users management', () => {
  test('@smoke create, filter, edit and delete a system user end-to-end', async ({
    loggedInPageManager,
  }) => {
    const username = uniqueUsername('testIrina');
    const updatedUsername = `${username}_edited`;
    const password = validPassword();

    const usersList = loggedInPageManager.systemUsersListPage();
    const userForm = loggedInPageManager.systemUserFormPage();

    await test.step('Navigate to System Users', async () => {
      // Direct link, not clicking through the Admin nav menu:
      // https://opensource-demo.orangehrmlive.com/web/index.php/admin/viewSystemUsers
      await usersList.goto();
    });

    await test.step('Create a new system user', async () => {
      await usersList.clickAdd();
      await userForm.expectLoaded('Add');

      await userForm.selectUserRole('Admin');
      await userForm.selectEmployee('m');
      await userForm.selectStatus('Enabled');
      await userForm.fillUsername(username);
      await userForm.fillPassword(password);
      await userForm.save();
      await userForm.expectSavedSuccessfully();
    });

    await test.step('Filter / search and verify the user appears', async () => {
      await usersList.filterByUsername(username);
      await usersList.expectUserVisible(username);
    });

    await test.step('Edit the user (change username)', async () => {
      await usersList.editUser(username);
      await userForm.expectLoaded('Edit');
      await userForm.fillUsername(updatedUsername);
      await userForm.save();
      await userForm.expectSavedSuccessfully();
    });

    await test.step('Verify the edit persisted', async () => {
      await usersList.resetFilters();
      await usersList.filterByUsername(updatedUsername);
      await usersList.expectUserVisible(updatedUsername);
    });

    await test.step('Delete the user and verify it is gone', async () => {
      await usersList.deleteUser(updatedUsername);
      await usersList.expectUserNotPresent(updatedUsername);
      await usersList.resetFilters();
    });
  });
});
