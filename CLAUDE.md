# Prism Code — notes for Claude

Learn Python by watching it run. Made 2026-11-20 for the user's friends who are nervous about the CS102 (BU) final
practical exam. A VS Code-coloured editor + console, a step-by-step stage where values float out of variables (faint,
with a glowing trail) into the variable that uses them, function calls slide in / out as cards, files fill line by line;
answer checking with hidden edge-case tests; the "BU Final" pack (the user's notebook); generated exam-style problems;
a predict-the-output quiz; open .py / .ipynb (+ the .txt files next to them). Fully offline.

Read first: `../CLAUDE.md` (suite rules) and `../docs/LESSONS.md`.
More detail: `docs/features.md`, `docs/pitfalls.md`, `docs/changelog.md`, `docs/ideas.md`.

## What the user opens
Desktop `Prism Code.lnk` → `prism-code\app\bin\prism-code.exe`. Everything (page + Pyodide ~13 MB) is embedded in the exe.

## Build
`bash tools/build.sh` (Git Bash, from `prism-code/`) — WinLibs + GNU Rust, target `%USERPROFILE%\PrismCodeBuild\target`,
kills the running app, copies the exe into `app\bin`. Check `ls -l app/bin/prism-code.exe` afterwards.
Libraries: `tools/vendor.sh` re-bundles CodeMirror (`tools/cm-entry.js` → `app/renderer/vendor/cm.js`) and copies Pyodide
into `app/renderer/pyodide/`; npm packages live in `%USERPROFILE%\PrismCodeBuild\vendor` (outside OneDrive).

## Layout
- `app/src-tauri/src/main.rs` — shell only: window buttons, About/update (`update.rs` from VoiceOpen), native file
  dialogs (IFileDialog), `fs_read` (UTF-8 / BOM / cp874) / `fs_write` (CRLF) / `fs_list` (.txt beside a .py), drag & drop
  events (`code:drop`, `code:dragover`), `app_args`, single instance (mutex), log `%LOCALAPPDATA%\com.prism.code\prism.log`.
- `app/renderer/py/tracer.py` — runs the learner's code in Pyodide with `sys.settrace`: records every step (stack +
  serialised locals), call / return / exception, effects (print / input / file open-write-read-close) and per-line static
  info (names read / written, if-test, simple subscripts like `parts[1]` with their values). Limits: 1.5 M lines, 12 s,
  2500 recorded steps. `input()` with no value left raises NeedInput → page asks, then re-runs from the top.
- `js/py-worker.js` + `js/runner.js` — Pyodide in a module worker; Stop = terminate + respawn.
- `js/editor.js` — CodeMirror 6 + own semantic painter (Dark Modern / Pylance colours, rainbow brackets, indent guides),
  Thai hover help, run marks (yellow current line, green previous, red error squiggle), `inline()` decorations for the
  step picture (`inlineField`, label / line-end / block strip widgets), `tokens(line)`, `rangeRect()`, `setHistory()`.
- `js/viz.js` — step player: paints the code (labels / faint line-end values / strip / spotlight via `ED.inline`), flies values
  between names in the editor (`codeFlights`), keeps the right "Values" panel as a summary, narration, hover history. `js/checker.js` — tests + char diff.
- `js/lib.js` — Library (คลัง): folders + own .py files, Prism Cam-style drag into folders, search, save folder to PC. `js/rail.js` — name rail (from Prism Rec).
- `js/packs.js` — BU Final (4 problems, hidden tests, answers, the user's first answers as find-the-bug).
- `js/gen.js` — 4 templates × stories; `finalize()` replaces the sample with the answer's real output (see pitfalls).
- `js/keysound.js` — keyboard sounds: 12 synthesised switches (`PACKS`), keydown / keyup listeners, menu in `app.js mountSoundMenu`.
- `js/quiz.js` — predict-the-output snippets. `js/notebook.js` — .ipynb → pack. `js/errors.js` — Thai explanations.
- State: `localStorage['prism.code.v1']` (docs, files per doc, generated problems, imported packs, progress, quiz score, UI).

## Test hooks
`PRISM_ACT` (comma list): `en` `th` `dark` `light` `info` `view:library|quiz|keys|code` `open:bu1..bu4` `buggy:bu1` `sol`
(answer into editor) `code:<urlencoded>` `run[:in1|in2]` `viz[:in1|in2]` `step:<n>` `goto:<i>` `pause` `check` `tab:viz|files|check`
`gen:t1..t4|any` `openfile:<path>` `libtab:prob|files` `mkfolder:<name>` `mkfile:<name>[@folder]` `right:off` `libdel:<name>` (removes test folders / files by exact name — the exe shares the user's real data!) `soundpop` `soundpick:<id>` `sound:on|off|demo|test|<id>` (test = log render times / peaks) `wait:<ms>` `quit`. `PRISM_MULTI=1` skips single instance.
Browser preview of the page: `.claude/launch.json` → `prism-code-ui` (node `%USERPROFILE%\PrismCodeBuild\test\serve.mjs`),
then `?act=…` in the URL and `window.__pc` (viz, ED, S, runTrace, runCheck, openProblem).
Node tests (Pyodide in Node): `%USERPROFILE%\PrismCodeBuild\test\t1.mjs` (one program, prints steps), `t2.mjs` (BU Final
answers + buggy variants on every test), `t3.mjs` (300 generated problems: sample == real output), `extract.mjs` (Thai
strings without English).

## Rules specific to this app
- Thai strings: `` T`…` `` → English in `app/renderer/js/lang-en.js`. Data strings shown through `T(…)` (test names,
  hints, topic names) need entries too; run `node extract.mjs`. Problem statements stay Thai (course material).
- Editor colours must stay VS Code Dark Modern (user asked: friends should feel at home). Don't add a light editor theme.
- A generated problem's sample output must come from running its answer (`finalize`), never from JS maths.
- `PKG_NAME` in main.rs must equal `app/package.json` "name" (`prism-code`).
- GitHub: `Pangpond543/prism-code` (public; `app/prism.config.json` → repo). New version: bump `app/package.json` + `app/src-tauri/Cargo.toml` + `tauri.conf.json`, `bash tools/release.sh` → `%USERPROFILE%\PrismCodeBuild\dist\Prism-Code-<ver>-Setup.exe` + `-Portable.zip` (NSIS reused from `PrismCamBuild\nsis-dl`), commit + push, `gh release create v<ver> <both files> --notes-file docs/release-notes-<ver>.md` (notes TH + EN). Check `gh release list` — a changelog line is not proof it shipped. No CI build.
