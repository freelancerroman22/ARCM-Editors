#!/bin/sh
# ARCM Edits panel installer (macOS)
DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/com.arcmedits.panel"

echo "Enabling CEP debug mode..."
for v in 9 10 11 12; do defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1 2>/dev/null; done

echo "Installing ARCM Edits panel..."
mkdir -p "$DEST"
cp -R "$DIR/extension/." "$DEST/"

echo "Installing Montserrat font..."
mkdir -p "$HOME/Library/Fonts"
cp -f "$DIR/extension/fonts/Montserrat-ExtraBold.ttf" "$HOME/Library/Fonts/" 2>/dev/null

echo ""
echo "Done. Quit After Effects completely, reopen it, then open"
echo "Window > Extensions > ARCM Edits"
echo ""
read -p "Press Return to close."
