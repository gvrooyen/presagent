@echo off
cd /d "%~dp0"
set PORT=8000
echo Serving presagent on http://127.0.0.1:%PORT%/
echo Demo: http://127.0.0.1:%PORT%/examples/night-signal/
echo Leave this window open while you present. Press Ctrl+C to stop.
start "" "http://127.0.0.1:%PORT%/examples/night-signal/"
where python >nul 2>&1 && python -m http.server %PORT% --bind 127.0.0.1 && goto :eof
where python3 >nul 2>&1 && python3 -m http.server %PORT% --bind 127.0.0.1 && goto :eof
echo Python is required to serve the deck locally (needed for the audio-output picker).
pause
