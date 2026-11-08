#!/bin/sh
# ARCM Edits - one-time transcription setup (macOS)
echo "============================================"
echo " ARCM Edits - one-time transcription setup"
echo "============================================"
echo ""

echo "[1/2] Checking for Python 3..."
if command -v python3 >/dev/null 2>&1; then
  PY=python3
else
  echo "Python 3 not found."
  echo "Install it from https://www.python.org/downloads/ then run this file again."
  open "https://www.python.org/downloads/" 2>/dev/null
  read -p "Press Return to close."
  exit 1
fi
echo "Python found: $($PY --version 2>&1)"
echo ""

echo "[2/2] Installing faster-whisper (first time downloads a few hundred MB)..."
$PY -m pip install --upgrade pip
$PY -m pip install faster-whisper
if [ $? -ne 0 ]; then
  echo ""
  echo "Install failed. Check your internet and run again."
  read -p "Press Return to close."
  exit 1
fi

echo ""
echo "============================================"
echo " Done! You can now use the panel's"
echo " 'Transcribe active video + caption' button."
echo "============================================"
read -p "Press Return to close."
