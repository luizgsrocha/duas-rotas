#!/usr/bin/env bash
set -euo pipefail

node --check app.js
node --check worker.js
node --check rn-hub.js
node --check functions/api/rides.js
node --check scripts/ci/security-check.mjs
node scripts/ci/security-check.mjs
node --test tests/*.test.mjs tests/*.test.cjs
node scripts/benchmark-rn-hub.mjs
npx --yes wrangler@4.156.0 deploy --dry-run --outdir /tmp/rua-nossa-dry-run
