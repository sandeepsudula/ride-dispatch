#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Get the LTS version from https://nodejs.org then run this again."
  open https://nodejs.org; read -p "Press Enter to close"; exit 1
fi
[ -d node_modules ] || { echo "First run: installing, this takes a minute..."; npm install --omit=dev; }
(sleep 3; open http://localhost:3000) &
node server.js
