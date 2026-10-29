#!/usr/bin/env bash
# 1 回ビルド → wrangler deploy と git push を並列実行（macOS / bash 向け）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! git diff --quiet --ignore-submodules HEAD 2>/dev/null || ! git diff --cached --quiet --ignore-submodules 2>/dev/null; then
  echo "ship: 未コミットの変更があります。commit してから実行してください。" >&2
  exit 1
fi

npm run build

npx wrangler deploy &
cf_pid=$!
git push &
git_pid=$!

fail=0
wait "$cf_pid" || fail=1
wait "$git_pid" || fail=1

if (( fail != 0 )); then
  echo "ship: wrangler deploy または git push のどちらかが失敗しました。" >&2
  exit 1
fi

echo "ship: 完了（Cloudflare + git push）"
