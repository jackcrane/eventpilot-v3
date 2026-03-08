#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT_DIR"

echo "Building and starting E2E docker services..."
docker compose -f docker-compose.e2e.yml up -d --build

echo "Waiting for app to be ready on http://localhost:3000..."
./api/scripts/wait-for-it.sh localhost:3000 -t 120

export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eventpilot_e2e?schema=public"

cd "$ROOT_DIR/e2e"
echo "Launching Cypress..."
npx cypress open
