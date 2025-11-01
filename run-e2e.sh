#!/usr/bin/env bash
set -euo pipefail

WATCH_MODE=0

while getopts ":w" opt; do
  case "${opt}" in
    w)
      WATCH_MODE=1
      ;;
    *)
      ;;
  esac
done

shift $((OPTIND - 1))

COMPOSE_ARGS=(docker compose -f e2e/docker-compose.yml up --build)

if [ "${WATCH_MODE}" = "1" ]; then
  env WATCH_MODE=1 "${COMPOSE_ARGS[@]}" "$@"
else
  "${COMPOSE_ARGS[@]}" --exit-code-from cypress "$@"
fi
