#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=cloudflare-account-id.sh
source "$ROOT/scripts/cloudflare-account-id.sh"
cd "$ROOT"
exec npx wrangler deploy "$@"
