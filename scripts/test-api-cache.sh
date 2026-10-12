#!/usr/bin/env bash
# Runs the unit tests for apps/mangodb/lib/apiCache.ts, the front end's GET
# cache: dedup, max age, eviction, invalidation, and clearing across tabs.
#
#   bash scripts/test-api-cache.sh
#
# Node's built-in test runner, with tsx (already installed at the workspace
# root for apps/api) to load TypeScript, so the front end needs no test
# framework of its own. --test-force-exit: the cross-tab test leaves the
# cache's BroadcastChannel open, as a browser tab would, and an open channel
# keeps Node running after the tests pass.
set -euo pipefail

cd "$(dirname "$0")/../apps/mangodb"

node --import tsx --test --test-force-exit \
    lib/apiCache.test.ts \
    lib/apiCache.crossTab.test.ts
