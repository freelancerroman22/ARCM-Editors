@echo off
setlocal enabledelayedexpansion
echo ============================================
echo  ARCM Edits - one-time transcription setup
echo ============================================
echo.

REM --- find a REAL python (the py launcher is most reliable; the bare "python"
REM     may be a Microsoft Store stub that is not actually installed) ---
set "PYCMD="
py -3 -c "import sys" >nul 2>&1 && set "PYCMD=py -3"
if not defined PYCMD ( python -c "import sys" >nul 2>&1 && set "PYCMD=python" )

if not defined PYCMD (
  echo [1/2] Python not found. Trying to install it with winget...
  winget install -e --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements
  py -3 -c "import sys" >nul 2>&1 && set "PYCMD=py -3"
  if not defined PYCMD ( python -c "import sys" >nul 2>&1 && set "PYCMD=python" )
)

if not defined PYCMD (
  echo.
  echo Could not set up Python automatically.
  echo Easiest fix: install Python from https://www.python.org/downloads/
  echo During install, TICK "Add python.exe to PATH", then run this file again.
  start "" "https://www.python.org/downloads/"
  pause
  exit /b 1
)

echo [1/2] Python OK  ( using: !PYCMD! )
echo.
echo [2/2] Installing faster-whisper (first time downloads a few hundred MB)...
!PYCMD! -m pip install --upgrade pip
REM --only-binary avoids compiling "av" from source (no C compiler needed)
!PYCMD! -m pip install --only-binary=:all: faster-whisper
if errorlevel 1 (
  echo Retrying with an explicit prebuilt av wheel...
  !PYCMD! -m pip install --only-binary=:all: "av==11.0.0"
  !PYCMD! -m pip install faster-whisper
)
if errorlevel 1 (
  echo.
  echo Install failed. Check your internet connection and run again.
  pause
  exit /b 1
)

echo.
echo ============================================
echo  Done! You can now use the panel's
echo  "Transcribe active video + caption" button.
echo ============================================
pause
