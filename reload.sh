#!/bin/bash
set -e

cd API
docker compose up -d
echo "API launched"

cd ../dashboard-frontend
npm install

(
    URL="http://localhost:3443/"

    open_url() {
        browser="$1"
        case "$browser" in
            firefox)
                if command -v firefox &>/dev/null; then firefox "$URL"; exit 0; fi ;;
            chrome|google-chrome)
                if command -v google-chrome &>/dev/null; then google-chrome "$URL"; exit 0; fi
                if command -v chrome &>/dev/null; then chrome "$URL"; exit 0; fi
                if command -v chromium &>/dev/null; then chromium "$URL"; exit 0; fi ;;
            *)
                command -v "$browser" &>/dev/null && "$browser" "$URL" && exit 0 ;;
        esac
    }

    case "$OSTYPE" in
        darwin*) open_url firefox; open_url chrome; command -v open &>/dev/null && open "$URL" ;;
        linux*)  open_url chrome; open_url firefox; command -v xdg-open &>/dev/null && xdg-open "$URL" ;;
        cygwin*|msys*|win32*) open_url chrome; open_url firefox; command -v start &>/dev/null && start "" "$URL" ;;
    esac

    echo "Impossible d’ouvrir le navigateur."
) & 

npm start

echo "Everything is launched"
