#!/usr/bin/env bash
# Runs inside mcr.microsoft.com/playwright. Unit tests first, then the real Mintlify site.
set -euo pipefail
MINT_VERSION="${MINT_VERSION:-latest}"
REPO=/repo
WORK=$(mktemp -d)

cd "$WORK"
npm init -y >/dev/null
npm install --silent --no-audit --no-fund playwright@1.56.1 >/dev/null
mkdir -p tests && cp "$REPO"/tests/*.cjs tests/
cp "$REPO/privatus-analytics.js" privatus-analytics.js

echo "== unit tests"
node tests/unit.cjs

echo "== mint dev ($MINT_VERSION)"
npm install --silent --no-audit --no-fund -g "mint@$MINT_VERSION" >/dev/null
mkdir site && cp -r "$REPO/example/." site/
sed -e "s/SITE_ID: 'pa_YOURSITEID'/SITE_ID: 'pa_Test123'/" \
    -e "s/ATTRIBUTES: {}/ATTRIBUTES: { 'data-allow-local': 'true' }/" \
    "$REPO/privatus-analytics.js" > site/privatus-analytics.js
grep -q "pa_Test123" site/privatus-analytics.js
grep -q "data-allow-local" site/privatus-analytics.js
(cd site && mint --version && mint dev --port 3000 > "$WORK/mint.log" 2>&1) &
for i in $(seq 1 180); do
  if curl -fs -o /dev/null http://localhost:3000/; then break; fi
  sleep 1
done
curl -fs -o /dev/null http://localhost:3000/ || { cat "$WORK/mint.log"; exit 1; }

echo "== e2e tests"
node tests/e2e.cjs
