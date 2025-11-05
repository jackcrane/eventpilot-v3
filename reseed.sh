#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="postgresql://jackcrane@127.0.0.1:5432/eventpilot-v3-local-test"

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <seed-file.sql>" >&2
  exit 1
fi

SEED_FILE="e2e/cypress/fixtures/db/$1"

if [ ! -f "$SEED_FILE" ]; then
  echo "Seed file not found: $SEED_FILE" >&2
  exit 1
fi

echo "==> Resetting database"
DATABASE_URL="$DATABASE_URL" yarn --cwd api prisma migrate reset --force --skip-seed

echo "==> Applying migrations"
DATABASE_URL="$DATABASE_URL" yarn --cwd api prisma migrate deploy

echo "==> Seeding database with $SEED_FILE"
psql "$DATABASE_URL" -f "$SEED_FILE"

echo "==> Done"