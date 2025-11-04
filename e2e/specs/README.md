# YAML-Driven Cypress Specs

Our end-to-end smoke tests can be expressed as Maestro-style YAML files inside this folder. Each `.yaml` file is converted into a Cypress spec under `e2e/cypress/e2e/generated` when you run the usual Cypress scripts (the generator lives at `e2e/scripts/generateYamlSpecs.js`).

## Anatomy of a Flow
- `name`: Display name for the suite (`describe` block).
- `description`: Optional comment inserted at the top of the generated spec.
- `seedFile`: Relative path to a SQL seed loaded before the test starts. Paths resolve first from `e2e/` and then `e2e/cypress/fixtures/db/`.
- `steps`: Ordered list of actions/assertions. Each entry is either a string (logged via `cy.log`) or a single-key object that maps to one of the supported commands below.

### Locators
Most step handlers accept a target element described via:
- `selector`: Any CSS selector string.
- `dataCy`: Convenience for `[data-cy="value"]`.
- `text`: Visible text. Uses `cy.contains` and supports `exact: false` for partial matches.

## Step Reference

| Step | Purpose | Notes |
| --- | --- | --- |
| `open: "/path"` | `cy.visit` a relative URL. You can use `{ path: "/dashboard" }` as an alternative. |
| `setViewport: { width, height }` | Calls `cy.viewport`. Useful for responsive layouts. |
| `tapOn` | Locates the element, waits until it is visible, then clicks. |
| `typeText: { selector/dataCy, text, clear?, submit? }` | Types into an input. Clears first unless `clear: false`. Appends `{enter}` when `submit: true`. |
| `assertVisible` | Waits for the element to be visible. Accepts either an object locator or a string shorthand for exact text matches; use `allowScroll: true` to bring off-screen elements into view first. |
| `assertContains: { selector/dataCy, text }` | Ensures the element contains the given text fragment. |
| `assertText: { selector/dataCy, text }` | Matches the element's text exactly. |
| `expectUrl` | Accepts a string (URL includes) or `{ equals | includes }` to validate location. |
| `scrollIntoView` | Scrolls the target into the viewport. |
| `waitFor` | Pauses explicitly. Use `number`, `{ ms }`, or `{ seconds }`. Favor assertions over manual waits when possible. |
| `saveSnapshot` | Writes the current DOM plus computed styles to `artifacts/snapshots/<name>.html`. Accepts a string or `{ name }`. |
| `takeScreenshot` | Captures a Cypress screenshot. Use `takeScreenshot:` (no payload) for defaults, a string name, or `{ name, options }` to forward to `cy.screenshot`. Each spec also captures an automatic final screenshot after the last step. |
| `log` | Writes to the Cypress log. Accepts a string or `{ message }`. |
| `pause` | Triggers `cy.pause()` for interactive debugging (ignored in CI). |

## Assertions and Waiting
Cypress automatically retries most commands until they succeed or time out. Every locator-based step above (`tapOn`, `assertVisible`, `assertContains`, `assertText`, etc.) leverages that retry behavior, so you usually do **not** need extra waits when the UI needs time to settle. For example, `assertVisible` translates to `cy.get(...).should('be.visible')`, which keeps polling until the element appears.

Use `waitFor` only when you must pause for a fixed duration (e.g., deliberate debounce windows) and prefer declarative assertions elsewhere. If you need to wait for navigation, combine `tapOn` with a follow-up `expectUrl` or `assertVisible` on content from the new page.

## Tips
- Keep specs focused—one user journey per file works best.
- Use descriptive `log` steps to make runtime output easy to follow.
- When adding new commands, extend `STEP_GENERATORS` inside `generateYamlSpecs.js`, then document them here so future authors know what is available.
