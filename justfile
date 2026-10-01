# One studio containing all registered projects.
[positional-arguments]
dev *args:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -x node_modules/.bin/moon ]; then corepack pnpm install --frozen-lockfile; fi
    exec ./node_modules/.bin/moon run repo:studio -- "$@"

# Compile the shared renderer and packed preview.
build:
    ./node_modules/.bin/moon run repo:build.all
