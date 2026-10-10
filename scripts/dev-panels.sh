# Project Management / Dev Wall contract: one unified email studio.
PANEL_SITES="studio"
PANEL_INSTALL="corepack pnpm install --frozen-lockfile"

panel_site() {
    case "$1" in
        studio) echo 'studio|.|55420|/|none|just dev' ;;
        *) return 1 ;;
    esac
}

# panel_start NAME PORT USUAL_PORT API_PORT
# --host binds every interface, so another Mac on the network opens the studio at
# <this-machine>.local:PORT (the studio's vite server allows .local hostnames).
panel_start() {
    exec bash shared/start-studio.sh --registry studio.projects.json --port "$2" --no-open --host
}

# No panel_serve: the studio is itself a vite dev server (jsx-email's
# startStudio loads and re-renders the registered projects live), and the repo
# has no production build of it to serve. It only runs in dev.
