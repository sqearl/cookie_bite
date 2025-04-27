#!/bin/bash

BASE_DIR="$(pwd)"
EXT_DIR="$BASE_DIR/mslogin_cookie_extension"
USER_DIR="/tmp/chrome-temp-profile-$$"

# Sanity check
if [ ! -f "$EXT_DIR/manifest.json" ] || [ ! -f "$EXT_DIR/background.js" ]; then
  echo "Missing manifest.json or background.js in $EXT_DIR"
  exit 1
fi

# Launch Chrome with clean flags
open -na "Google Chrome" --args \
  --disable-extensions-except="$EXT_DIR" \
  --load-extension="$EXT_DIR" \
  --user-data-dir="$USER_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --disable-default-apps \
  --new-window "https://login.microsoftonline.com"

echo "Chrome launched cleanly with extension loaded."

