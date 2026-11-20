#!/usr/bin/env bash
# Re-bundle the editor (CodeMirror) and copy Pyodide into app/renderer. Only needed when upgrading those libraries.
# npm packages live outside OneDrive in %USERPROFILE%\PrismCodeBuild\vendor (entry file: cm-entry.js there).
set -e
cd "$(dirname "$0")/.."
R="$(pwd)/app/renderer"
cd "$USERPROFILE/PrismCodeBuild/vendor"
npx esbuild cm-entry.js --bundle --format=esm --minify --outfile="$R/vendor/cm.js"
cd node_modules/pyodide
cp pyodide.mjs pyodide.asm.mjs pyodide.asm.wasm python_stdlib.zip pyodide-lock.json "$R/pyodide/"
