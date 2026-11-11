@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
set "HERE=%CD%"
set "PORT=8000"
if exist "%HERE%\engine\presagent.js" (
  set "ROOT=%HERE%"
  set "URL_PATH=/"
) else if exist "%HERE%\..\engine\presagent.js" (
  for %%I in ("%HERE%\..") do set "ROOT=%%~fI"
  for %%I in ("%HERE%") do set "URL_PATH=/%%~nxI/"
) else if exist "%HERE%\..\..\engine\presagent.js" (
  for %%I in ("%HERE%\..\..") do set "ROOT=%%~fI"
  for %%I in ("%HERE%\..") do set "PARENT=%%~nxI"
  for %%I in ("%HERE%") do set "DECK=%%~nxI"
  set "URL_PATH=/!PARENT!/!DECK!/"
) else (
  echo Could not find engine\presagent.js.
  echo Keep this deck inside the presagent repo, or copy engine\ into the deck folder.
  pause
  exit /b 1
)
echo Serving on http://127.0.0.1:%PORT%%URL_PATH%
echo Leave this window open while you present. Press Ctrl+C to stop.
start "" "http://127.0.0.1:%PORT%%URL_PATH%"
cd /d "%ROOT%"
where python >nul 2>&1 && python -m http.server %PORT% --bind 127.0.0.1 && goto :eof
where python3 >nul 2>&1 && python3 -m http.server %PORT% --bind 127.0.0.1 && goto :eof
echo Python is required to serve the deck locally (needed for the audio-output picker).
pause
