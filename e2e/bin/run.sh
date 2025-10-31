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
  if [ -f "$workspace/yarn.lock" ]; then
    log_step "Installing dependencies in $workspace"
    yarn install --cwd "$workspace" --frozen-lockfile --verbose
  else
    log_step "Installing dependencies in $workspace (no lockfile detected)"
    yarn install --cwd "$workspace" --verbose
  fi
}

maybe_install /workspace/app
maybe_install /workspace/api
maybe_install /workspace/e2e

log_step "Building frontend (app)"
yarn --cwd /workspace/app build
log_step "Generating Prisma client (api)"
yarn --cwd /workspace/api prisma generate

log_step "Starting Cypress run"
yarn --cwd /workspace/e2e cypress run "$@"
