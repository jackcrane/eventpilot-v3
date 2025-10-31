#!/usr/bin/env bash
set -euo pipefail

docker compose -f e2e/docker-compose.yml up --build --exit-code-from cypress
