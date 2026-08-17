# Decision brief

## Why the POM is structured this way

Each screen the flow touches gets its own page object: `LoginPage`,
`SidebarMenu`, `SystemUsersListPage`, `SystemUserFormPage`. The list and the
Add/Edit form are two separate classes even though they're visually
"the same feature" in the task description, because they are, functionally,
two different screens with different lifecycles - the list owns
search/filter/table/delete, the form owns its own field-level validation and
save/cancel. Merging them into one `SystemUsersPage` god-object would mean
every spec drags around locators for a screen it isn't currently on, and any
future person extending this ends up guessing which half of a giant class
their new method belongs in.

`PageManager` is a thin factory, not a base class or a "world" object -
specs ask it for the page object they need (`pageManager.systemUsersListPage()`),
and each is created lazily on first access. That keeps constructor cost down
for specs that don't touch every screen, and keeps the specs reading like
plain English ("go to admin users, filter by username, verify visible") with
zero raw selectors.

The custom fixture (`test-fixtures.ts`) provides `credentials` (sourced from
env vars, defaulting to the demo's published creds) and a `loggedInPageManager`
that performs login once as a fixture setup step rather than as boilerplate
at the top of every test. This was the one item from the "optional stretch"
list I prioritized, because it's the difference that most affects whether a
teammate can add a tenth test next week without copy-pasting a login block.

## Waits / flaky UI

No `waitForTimeout` anywhere in the suite. Three patterns instead:

1. **Playwright's built-in auto-waiting** via `expect(locator)...` and
   locator actions (`.click()`, `.fill()`) for the common case - these already
   retry until the element is actionable.
2. **`page.waitForURL(...)`** after any action that triggers a client-side
   route change (login, navigating to Admin > Users, opening the Add/Edit
   form, saving). OrangeHRM is an SPA; asserting on the URL is a cheap, precise
   signal that a transition actually completed, instead of guessing a delay.
3. **A `waitForLoadingToFinish()` helper** in `BasePage` that waits out the
   oxd loading-spinner overlay - but only if one actually appears (some
   requests resolve faster than the spinner renders, so it probes for
   "visible" first with a short timeout and only then waits for "hidden").
   This is the one place a fixed sleep would have been tempting (searching,
   saving, deleting all fire an AJAX call), and it's exactly the place a
   fixed sleep would be least reliable, since the shared demo's response
   time isn't constant.

## Handling shared-demo data collisions

- **Usernames** are generated as `auto_<timestamp>_<random5>` (`testData.ts`),
  so two runs starting in the same millisecond still don't collide.
- **The suite never assumes the user list is empty.** Filtering by the
  generated username, rather than asserting on row counts or "the first row",
  is what makes this safe against other people's data sitting in the same
  table.
- **Cleanup happens in the test itself** (delete + verify gone, as the last
  step), rather than in an `afterAll`/global teardown, so a failure mid-test
  doesn't silently skip cleanup - though it also means a test that fails
  *before* the delete step will leave a `auto_...` user behind. Given the
  timebox, I accepted that risk rather than adding teardown-on-failure
  machinery; see "next hour" below.
- **Employee association** (a required field on Add User) is the one place I
  intentionally kept loose: I search for the single letter `a`, which will
  match essentially any seeded employee list, rather than a specific name that
  might not exist in a given run of the shared demo. The *edit* step
  deliberately changes Status instead of touching the employee link again,
  per the task's own guidance that this association is the more unstable of
  the two.

## One selector I'd improve

The Add/Edit User form's `Username` field is fetched by scoping to the
`.oxd-input-group` whose child `<label>` reads exactly "Username"
(`SystemUserFormPage.fieldGroup()`). It works, but it's a workaround: the oxd
component library doesn't wire a real `for`/`id` relationship between the
`<label>` and its `<input>`, so `getByLabel('Username')` - the locator I'd
actually want to write - can't resolve it. The row-action icons (edit/delete)
are worse: they're icon-only with no `aria-label` at all, so they can only be
found by CSS class name scoped to the row.

If I owned the product, I'd add `data-testid` to both: something like
`data-testid="user-username-input"` and `data-testid="user-row-edit"` /
`data-testid="user-row-delete"` (parameterized per row, e.g.
`data-testid="user-row-edit-{id}"`, would be even better). It's a small
change that turns two of the more fragile locators in this suite into
one-line, refactor-proof lookups - and it costs nothing at runtime.

## What I'd do next with another hour

- Add teardown-on-failure: a fixture that records any username created
  during a test and force-deletes it in an `afterEach` if it still exists,
  so a mid-test failure never leaves orphaned `auto_...` rows in the shared
  demo.
- Add an API-level cleanup path (or at least a "list all `auto_*` users older
  than N hours and delete them" maintenance script) as a belt-and-suspenders
  measure against the above.
- Widen the negative-path coverage: duplicate-username rejection ("Username
  already exists"), password-confirmation-mismatch validation, and a
  User Role filter combined with a Username filter (compound search).
- Add a `data-testid` migration proposal (see above) as an actual patch
  against a local checkout of the app, if source access were available,
  rather than just describing it here.
- Re-run the full suite against the live demo from an unrestricted network
  and true up any selector that drifted from what's assumed here (see the
  network note in README.md).
