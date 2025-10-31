-- Placeholder seed for example.cy.js.
-- Replace with a pg_dump generated via e2e/scripts/dump-db.js for real tests.

-- Create a schema marker so reseeding succeeds.
CREATE SCHEMA IF NOT EXISTS e2e_placeholder;

CREATE TABLE IF NOT EXISTS e2e_placeholder_runs (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO e2e_placeholder_runs DEFAULT VALUES;
