#!/bin/bash

# Rabbit Forex - Installation Script

EXTENSION_UUID="rabbitforex@rabbit-company.com"
EXTENSION_DIR="$HOME/.local/share/gnome-shell/extensions/$EXTENSION_UUID"

echo "Installing Rabbit Forex extension..."

# Create extension directory
mkdir -p "$EXTENSION_DIR/schemas"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Copy files
cp "$SCRIPT_DIR/extension.js" "$EXTENSION_DIR/"
cp "$SCRIPT_DIR/prefs.js" "$EXTENSION_DIR/"
cp "$SCRIPT_DIR/metadata.json" "$EXTENSION_DIR/"
cp "$SCRIPT_DIR/stylesheet.css" "$EXTENSION_DIR/"
cp "$SCRIPT_DIR/schemas/"*.xml "$EXTENSION_DIR/schemas/"

# Compile schemas
echo "Compiling schemas..."
glib-compile-schemas "$EXTENSION_DIR/schemas/"

echo ""
echo "Installation complete!"
echo ""
echo "To enable the extension:"
echo "  1. Restart GNOME Shell (press Alt+F2, type 'r', press Enter)"
echo "     Or log out and log back in"
echo "  2. Enable the extension using:"
echo "     gnome-extensions enable $EXTENSION_UUID"
echo ""
echo "To open preferences:"
echo "     gnome-extensions prefs $EXTENSION_UUID"
echo ""
