#!/usr/bin/env bash
# Channel: a sixty-second measurement of an unaided human input channel
# Launches the game in your default browser. No setup, no deps.
#
# Requires only python3 (preinstalled on macOS).

set -euo pipefail

cd "$(dirname "$0")"

PORT="${PORT:-8765}"
URL="http://localhost:${PORT}/"

echo "› Channel"
echo "› hosted: https://jeevankarandikar.com/projects/channel"
echo "› local:  ${URL}  (serving $(pwd))"
echo "› Ctrl+C to stop"
echo

# Open the browser shortly after the server starts.
( sleep 0.6 && open "${URL}" >/dev/null 2>&1 || xdg-open "${URL}" >/dev/null 2>&1 || true ) &

exec python3 -m http.server "${PORT}" --bind 127.0.0.1
