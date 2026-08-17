# OrangeHRM System Users - E2E Suite

Playwright + TypeScript end-to-end tests for **Admin > User Management > Users**
on the [OrangeHRM demo](https://opensource-demo.orangehrmlive.com/web/index.php/admin/viewSystemUsers).

Covers the full lifecycle of a system user: create → filter/search → edit → delete →
verify gone, plus a small set of negative-path checks (invalid login, empty search
results, missing required fields on create).

## Stack

- [Playwright Test](https://playwright.dev) + TypeScript
- Page Object Model, with a `PageManager` factory
- A custom fixture for credentials + an authenticated `PageManager`

## Project layout

```
src/
  pages/
    BasePage.ts             shared waits/toast helpers
    LoginPage.ts
    SidebarMenu.ts           left-nav (Admin link etc.)
    SystemUsersListPage.ts   search/filter/table/delete
    SystemUserFormPage.ts    Add/Edit User form
    PageManager.ts           factory that hands out page objects
  fixtures/
    test-fixtures.ts         `credentials`, `pageManager`, `loggedInPageManager`
  utils/
    testData.ts              unique username/password generators
tests/
  system-users.crud.spec.ts       required flow, tagged @smoke
  system-users.negative.spec.ts   stretch/negative cases, tagged @regression
```

## Install

Requires Node 18+.

```bash
npm install
npx playwright install chromium   # downloads the browser binary Playwright needs
```

## Run

```bash
npm test                 # full suite, headless
npm run test:headed      # same, with a visible browser
npm run test:smoke       # only @smoke (the required CRUD flow)
npm run test:regression  # only @regression (negative/stretch cases)
npm run report           # open the last HTML report
```

Tests run against `https://opensource-demo.orangehrmlive.com` by default. To point
at a different instance, copy `.env.example` to `.env` and edit `BASE_URL`,
`ADMIN_USERNAME`, `ADMIN_PASSWORD`.

Tests are intentionally run with a single worker (`workers: 1` in
`playwright.config.ts`) rather than in parallel. This is a shared public demo
instance - other people's runs are hitting the same dataset at the same time,
and serial execution keeps this suite's own steps (create → filter → edit →
delete on *one* row) from racing each other across workers.

### Env notes

- `PW_EXECUTABLE_PATH` (optional): if your environment provisions its own
  Chromium binary instead of Playwright's managed download (common on locked-down
  CI runners with restricted network egress), point this at it and the config
  will use it instead of trying to launch Playwright's default browser.
- `BASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`: see `.env.example`.

## A note on how this was verified

The environment this suite was authored in has restricted network egress and
could not reach `opensource-demo.orangehrmlive.com` directly. To still validate
the automation logic itself (locator strategy, waits, assertions, control flow)
rather than shipping unverified code, the exact same spec files were run
against a small local static mock that reproduces OrangeHRM's relevant DOM
patterns (oxd-style unlabelled form groups, icon-only row actions, a toast
component, a confirmation dialog, etc.) - all four tests passed against it.

**Please run `npm test` against the real demo as your first step** - the POM
isolates every selector in one small, well-commented file per page, so if any
exact class name has drifted on the live site, there is exactly one place to
fix it per screen. See `NOTES.md` for the one selector most likely to need a
tweak.

## Optional CI

A minimal GitHub Actions workflow is included at
`.github/workflows/playwright.yml` (single job, single browser, no matrix) -
enable it by pushing to a repo with Actions turned on.
