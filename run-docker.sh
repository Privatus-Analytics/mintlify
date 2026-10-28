#!/usr/bin/env bash
# Runs every test in Docker: unit tests in a real browser, then a real `mint dev` site.
set -euo pipefail
cd "$(dirname "$0")"
docker run --rm --ipc=host -e MINT_VERSION="${MINT_VERSION:-latest}" \
  -v "$PWD:/repo:ro" mcr.microsoft.com/playwright:v1.56.1-jammy bash /repo/tests/run.sh
