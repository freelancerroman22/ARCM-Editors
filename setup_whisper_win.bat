@echo off
setlocal
echo ============================================
echo  ARCM Edits - one-time transcription setup
echo ============================================
echo.

echo [1/2] Checking for Python...
where python >nul 2>&1
if %ERRORLEVEL%==0 goto HAVEPY

echo Python not found. Trying to install it with winget...
winget install -e --id Python.Python.3.12 --accept-source-agreements --accept-package-agreements
where python >nul 2>&1
if %ERRORLEVEL%==0 goto HAVEPY

echo.
echo Could not install Python automatically.
echo Please install Python from https://www.python.org/downloads/
echo ( tick "Add Python to PATH" during install ), then run this file again.
start "" "https://www.python.org/downloads/"
pause
exit /b 1

:HAVEPY
echo Python found.
echo.
echo [2/2] Installing faster-whisper (first time downloads a few hundred MB)...
python -m pip install --upgrade pip
python -m pip install faster-whisper
if %ERRORLEVEL% NEQ 0 (
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
