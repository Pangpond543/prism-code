#!/usr/bin/env bash
# Build Prism Code and put the exe where the desktop shortcut points (app/bin). Dev helper — not for the user.
# The page (app/renderer, incl. Pyodide ~13 MB) is embedded in the exe.
set -e
cd "$(dirname "$0")/.."
W=$(cygpath -u "$(ls -d "$LOCALAPPDATA/Microsoft/WinGet/Packages/"*WinLibs*/mingw64/bin | head -1)")
export PATH="$W:$HOME/.cargo/bin:$HOME/.rustup/toolchains/stable-x86_64-pc-windows-gnu/bin:$PATH"
export CARGO_TARGET_DIR="$USERPROFILE/PrismCodeBuild/target"      # NEVER under AppData
cargo build --release --manifest-path app/src-tauri/Cargo.toml
taskkill //F //IM prism-code.exe 2>/dev/null || true
sleep 1
mkdir -p app/bin
cp "$CARGO_TARGET_DIR/release/prism-code.exe" app/bin/
[ -f "$CARGO_TARGET_DIR/release/WebView2Loader.dll" ] && cp "$CARGO_TARGET_DIR/release/WebView2Loader.dll" app/bin/ || true
ls -l app/bin/prism-code.exe
