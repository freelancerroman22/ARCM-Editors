#!/bin/sh
# FlexCaptions panel installer (macOS)
DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/Library/Application Support/Adobe/CEP/extensions/com.arcmedits.panel"

echo "Enabling CEP debug mode..."
for v in 9 10 11 12; do defaults write "com.adobe.CSXS.$v" PlayerDebugMode 1 2>/dev/null; done

echo "Installing ARCM Edits panel to:"
echo "  $DEST"
mkdir -p "$DEST"
cp -R "$DIR/extension/." "$DEST/"

echo ""
echo "Done. Quit After Effects completely, reopen it, then open"
echo "Window > Extensions > ARCM Edits"
echo "(The panel updates itself from GitHub after this.)"
echo ""
read -p "Press Return to close."
