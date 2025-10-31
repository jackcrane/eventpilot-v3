# End-to-End Testing

This repository ships a Cypress-based end-to-end testing harness that runs entirely inside Docker. Each spec file is executed against its own isolated Postgres database that is populated from a `pg_dump` snapshot before the spec starts. You can optionally reseed the database inside a spec to reset state between tests.

## Project Layout

```
e2e/
├── Dockerfile                # Cypress image with Postgres tooling
├── docker-compose.yml        # Orchestrates Cypress + Postgres containers
├── bin/run.sh                # Installs deps, builds the app, runs Cypress
├── cypress.config.cjs        # Cypress configuration and hooks
├── cypress/
│   ├── e2e/                  # Spec files (one dump per spec)
│   ├── fixtures/db/          # `pg_dump` snapshots for each spec
│   └── support/              # Custom commands + Node lifecycle code
└── scripts/dump-db.js        # Helper to create new dumps
```

## Running the Suite

1. Ensure the frontend build artifacts exist (the Docker runner builds them automatically).
2. From the repository root run:
   ```bash
   docker compose -f e2e/docker-compose.yml up --build --exit-code-from cypress
   ```
   The Cypress container will install dependencies, build the frontend, generate Prisma clients, and then execute the specs.

The Cypress runner boots the API inside the same container. Requests from the React app continue to use `http://127.0.0.1:3000`, so no application code changes are required.

## Database Seeding Workflow

- Each spec file under `e2e/cypress/e2e/**` must have a matching dump under `e2e/cypress/fixtures/db/**`.
  - Example: `cypress/e2e/onboarding.cy.js` → `cypress/fixtures/db/onboarding.sql` (custom `.dump` files are also accepted).
- Dumps should contain *data only* (the schema is already managed by the application). Use the plain-text SQL produced by `pg_dump -Fp` (recommended) or a custom-format `.dump` if you prefer a binary snapshot.
- Before a spec runs we:
  1. Create a brand new Postgres database.
  2. Restore the matching dump.
  3. Start the API with `DATABASE_URL` pointing at that database.
- After the spec completes we stop the API and drop the database.

If the dump cannot be restored (for example, the schema is stale) the harness fails the spec with a descriptive error so you can regenerate the snapshot.

### Reseeding Within a Spec

Use the custom Cypress command to reset state inside a spec:

```js
cy.reSeedDb();
```

This reloads the dump for the current spec. If the restore fails, the command throws and the test fails with the underlying `pg_restore` error.

### Generating Dumps

The helper script wraps `pg_dump` so it is easy to create consistent snapshots.

```bash
node e2e/scripts/dump-db.js \
  --url postgres://postgres:postgres@localhost:5432/your_db \
  --out e2e/cypress/fixtures/db/onboarding.sql
```

Options:
- `--format custom|plain` (default `plain` for human-readable SQL).
- Dumps are generated with `--data-only` by default. Pass `--with-schema` if you need schema + data, or `--schema-only` for schema-only dumps.
- `--out` accepts relative paths (directories are created automatically).

Ensure the schema in the dump aligns with the application migrations; otherwise the restore step will fail during the run.

## Creating New Specs

1. Create `e2e/cypress/e2e/<name>.cy.js`.
2. Produce the database snapshot using the dumper utility and place it under `e2e/cypress/fixtures/db/<name>.sql` (custom `.dump` files also work).
3. Implement your Cypress tests.
4. Run the suite via Docker.

You can keep multiple tests inside the same spec. Call `reSeedDb()` whenever you need a clean slate inside that spec.

## Local Development Tips

- The Cypress container mounts `api`, `app`, and `e2e` node_modules as volumes so repeated runs reuse the installation cache.
- To run Cypress headed, drop into the container interactively:
  ```bash
  docker compose -f e2e/docker-compose.yml run --build --service-ports cypress bash
  ```
  Then run `yarn --cwd e2e cypress open`.
- Use `docker compose down -v` to reset the Postgres volume if needed.

## Placeholder Spec

The scaffold ships with `example.cy.js` and a minimal SQL seed so you can verify that the wiring works. Replace it with real coverage once you have authoritative dumps from your environment.
