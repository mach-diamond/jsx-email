# Project Management / Dev Wall contract: one unified email studio.
PANEL_SITES="studio"
PANEL_INSTALL="corepack pnpm install --frozen-lockfile"

panel_site() {
    case "$1" in
        studio) echo 'studio|.|55420|/|none|just dev' ;;
        *) return 1 ;;
    esac
}

panel_start() {
    exec bash shared/start-studio.sh --registry studio.projects.json --port "$2" --no-open
}
