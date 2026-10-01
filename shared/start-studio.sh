#!/usr/bin/env bash
set -euo pipefail
studio_root="$(cd "$(dirname "$0")/.." && pwd -P)"
if [ ! -x "$studio_root/node_modules/.bin/moon" ]; then
    (cd "$studio_root" && corepack pnpm install --frozen-lockfile)
fi
studio_entry="$studio_root/packages/jsx-email/dist/studio/server.js"
if [ ! -f "$studio_entry" ] || [ ! -f "$studio_root/packages/jsx-email/dist/preview/main.tsx" ] || \
   [ -n "$(find "$studio_root/packages/jsx-email/src" "$studio_root/apps/preview/app/src" "$studio_root/apps/preview/scripts" -type f -newer "$studio_entry" -print -quit 2>/dev/null)" ]; then
    (cd "$studio_root" && ./node_modules/.bin/moon run repo:build.all)
fi
exec node "$studio_root/packages/jsx-email/cli.js" studio "$@"
