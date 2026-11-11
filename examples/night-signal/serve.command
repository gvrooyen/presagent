#!/bin/bash
cd "$(dirname "$0")"
HERE="$(pwd)"
PORT="${PORT:-8000}"
if [ -f "$HERE/engine/presagent.js" ]; then
  ROOT="$HERE"
  URL_PATH="/"
elif [ -f "$HERE/../engine/presagent.js" ]; then
  ROOT="$(cd "$HERE/.." && pwd)"
  URL_PATH="/$(basename "$HERE")/"
elif [ -f "$HERE/../../engine/presagent.js" ]; then
  ROOT="$(cd "$HERE/../.." && pwd)"
  URL_PATH="/$(basename "$(dirname "$HERE")")/$(basename "$HERE")/"
else
  echo "Could not find engine/presagent.js."
  echo "Keep this deck inside the presagent repo, or copy engine/ into the deck folder."
  exit 1
fi
URL="http://127.0.0.1:${PORT}${URL_PATH}"
echo "Serving on $URL"
echo "Leave this window open while you present. Press Ctrl+C to stop."
if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "Python is required to serve the deck locally (needed for the audio-output picker)."
  exit 1
fi
(sleep 1
  if command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  fi) &
cd "$ROOT"
exec "$PY" -m http.server "$PORT" --bind 127.0.0.1
