#!/usr/bin/env bash
set -euo pipefail
studio_root="$(cd "$(dirname "$0")/.." && pwd -P)"
if [ ! -x "$studio_root/node_modules/.bin/moon" ]; then
    (cd "$studio_root" && corepack pnpm install --frozen-lockfile)
fi
studio_entry="$studio_root/packages/jsx-email/dist/studio/server.js"
studio_revision="$(git -C "$studio_root" rev-parse HEAD)"
studio_stamp="$studio_root/node_modules/.cache/email-studio-build-revision"
if [ ! -f "$studio_entry" ] || [ ! -f "$studio_root/packages/jsx-email/dist/preview/main.tsx" ] || \
   [ ! -f "$studio_root/packages/canispam/dist/classifier/spamscanner-classifier.json" ] || \
   [ "$(cat "$studio_stamp" 2>/dev/null || true)" != "$studio_revision" ] || \
   [ -n "$(find "$studio_root/packages/jsx-email/src" "$studio_root/packages/canispam/src" "$studio_root/apps/preview/app/src" "$studio_root/apps/preview/scripts" -type f -newer "$studio_entry" -print -quit 2>/dev/null)" ]; then
    (cd "$studio_root" && ./node_modules/.bin/moon run repo:build.all --cache off)
    mkdir -p "$(dirname "$studio_stamp")"
    printf '%s\n' "$studio_revision" > "$studio_stamp"
fi
exec node "$studio_root/packages/jsx-email/cli.js" studio "$@"
