#!/bin/bash
cd "$(dirname "$0")"
PORT="${PORT:-8000}"
URL="http://127.0.0.1:${PORT}/examples/history-of-cinema/"
echo "Serving presagent on http://127.0.0.1:${PORT}/"
echo "Demo: $URL"
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
exec "$PY" -m http.server "$PORT" --bind 127.0.0.1
