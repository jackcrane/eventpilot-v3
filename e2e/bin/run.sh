#!/bin/sh
set -eu

export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
export YARN_LOG_LEVEL=verbose

log_step() {
  echo ""
  echo "==> $1"
  echo ""
}

maybe_install() {
  workspace="$1"
  install_state_file="$workspace/node_modules/.install-state"
  lockfile_checksum=""
  if [ -f "$workspace/yarn.lock" ]; then
    lockfile_checksum="$(sha256sum "$workspace/yarn.lock" | awk '{ print $1 }')"
  fi

  if [ "${FORCE_DEP_INSTALL:-0}" != "1" ] && [ -d "$workspace/node_modules" ]; then
    if [ -n "$lockfile_checksum" ] && [ -f "$install_state_file" ]; then
      if [ "$(cat "$install_state_file")" = "$lockfile_checksum" ]; then
        log_step "Skipping dependency install in $workspace (lockfile unchanged)"
        return
      fi
    elif [ -z "$lockfile_checksum" ]; then
      log_step "Skipping dependency install in $workspace (no lockfile detected, node_modules present)"
      return
    fi
  fi

  if [ -f "$workspace/yarn.lock" ]; then
    log_step "Installing dependencies in $workspace"
    yarn install --cwd "$workspace" --frozen-lockfile --verbose
  else
    log_step "Installing dependencies in $workspace (no lockfile detected)"
    yarn install --cwd "$workspace" --verbose
  fi

  if [ -n "$lockfile_checksum" ]; then
    mkdir -p "$workspace/node_modules"
    printf "%s" "$lockfile_checksum" > "$install_state_file"
  else
    rm -f "$install_state_file" >/dev/null 2>&1 || true
  fi
}

maybe_install /workspace/app
maybe_install /workspace/api
maybe_install /workspace/e2e

WATCH_MODE="${WATCH_MODE:-0}"

log_step "Rebuilding native modules (api)"
yarn --cwd /workspace/api run rebuild:native

log_step "Building frontend (app)"
yarn --cwd /workspace/app build
log_step "Generating Prisma client (api)"
yarn --cwd /workspace/api prisma generate

API_PID=""
GENERATOR_PID=""

cleanup() {
  if [ -n "${API_PID}" ]; then
    if kill -0 "${API_PID}" >/dev/null 2>&1; then
      kill "${API_PID}" >/dev/null 2>&1 || true
    fi
    wait "${API_PID}" 2>/dev/null || true
  fi
  if [ -n "${GENERATOR_PID}" ]; then
    if kill -0 "${GENERATOR_PID}" >/dev/null 2>&1; then
      kill "${GENERATOR_PID}" >/dev/null 2>&1 || true
    fi
    wait "${GENERATOR_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

ensure_database() {
  yarn --cwd /workspace/e2e node scripts/ensureExternalDatabase.js
}

wait_for_api() {
  yarn --cwd /workspace/e2e node scripts/waitForPort.js
}

start_api() {
  log_step "Starting API server"

  API_DATABASE_NAME_VALUE="${API_DATABASE_NAME:-e2e_api}"
  export API_DATABASE_NAME="${API_DATABASE_NAME_VALUE}"

  ensure_database

  API_DATABASE_HOST="${POSTGRES_HOST:-postgres}"
  API_DATABASE_PORT="${POSTGRES_PORT:-5432}"
  API_DATABASE_USER="${POSTGRES_USER:-postgres}"
  API_DATABASE_PASSWORD="${POSTGRES_PASSWORD:-postgres}"

  export API_MANAGED_EXTERNALLY=true
  export PORT="${API_PORT:-3000}"
  export NODE_ENV=test
  export E2E=true
  export DATABASE_URL="postgres://${API_DATABASE_USER}:${API_DATABASE_PASSWORD}@${API_DATABASE_HOST}:${API_DATABASE_PORT}/${API_DATABASE_NAME_VALUE}"

  log_step "Applying Prisma migrations"
  yarn --cwd /workspace/api prisma migrate deploy

  yarn --cwd /workspace/api start:e2e &
  API_PID=$!

  log_step "Waiting for API to become ready"
  wait_for_api
}

start_api

if [ "${WATCH_MODE}" = "1" ]; then
  log_step "Starting YAML spec watcher"
  yarn --cwd /workspace/e2e node scripts/generateYamlSpecs.js --watch &
  GENERATOR_PID=$!

  log_step "Starting Cypress watch runner"
  yarn --cwd /workspace/e2e node scripts/watchAndRunCypress.js "$@"
else
  log_step "Starting Cypress run"
  yarn --cwd /workspace/e2e cypress --browser chrome "$@"
fi
