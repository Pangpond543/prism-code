# Prism Code — changelog

## 2026-11-20 — first GitHub release (Pangpond543/prism-code)
- `tools/release.sh` builds `Prism-Code-<ver>-Setup.exe` (NSIS, per-user, `tools/installer.nsi`) + `-Portable.zip`. In-app updater ported from Prism Cam (`update::apply_release`: installed → new Setup.exe run with `/S /RELAUNCH`; portable → zip unpacked over the folder, in-use files renamed `*.old`, cleaned at start). README (TH+EN), LICENSE (MIT), `.gitignore` added; `prism.config.json` repo set.
- About box: "built with" model changed from Claude Fable 5.2 to **Claude Opus 5.5** (`app.js` `MODEL`). — user request.

## 2026-11-20 — v1.0.0, first version
- New app at the user's request: a Python teaching tool for friends worried about the CS102 final practical exam.
  Windows exe + desktop shortcut like the other Prism apps (Tauri 2), fully offline (Pyodide 3.14 in a worker).
- Editor coloured exactly like VS Code Dark Modern (user's emphasis: friends should get used to the real thing).
- Step-by-step stage with values floating between variables, function call cards, file cards (user's main idea).
- Answer checking with hidden edge-case tests, Thai error explanations, Files tab (text file read / write support).
- "BU Final" pack from the user's notebook (answers hidden + the user's own first answers as find-the-bug — both picked
  by the user), problem generator, .ipynb / .py import, predict-before-run (picked by the user from the proposed ideas).
- Tested: tracer under Node (BU Final answers vs every test, 300 generated problems sample == real output), browser
  preview, and the built exe via PRISM_ACT (TH / EN, light / dark, run, step-by-step, check, notebook import, quiz).

## 2026-11-20 — v1.1.0, the animation moves into the code
- User asked: values should float slowly into the code itself, show which variable goes into which, faint values
  above the names, function calls shown in the middle editor. Chosen with the user (options picked):
  - labels above every name on the running line (blue = value read, pink = value just stored, purple = parameter);
    faint `name = value` / `→ True` after lines that already ran (like VS Code's inline values);
  - ~2.5 s per line at 1× (fly 1.45 s, value lands, short hold, then the next line);
  - substitution strip under the running line: `amount * 0.90 → 2500.0 * 0.90 → 2250.0` (also if-tests, f-strings, return);
  - calls: each argument flies from the call site up to its parameter in `def`; return flies the value back down to the
    variable on the calling line;
  - spotlight (other lines fade, never-run lines fade more; toggle in the playback bar);
  - hover a variable = every value it had, click one to jump to that step;
  - the right panel is now a plain "Values" summary (no flights), hideable with Ctrl+J; play controls + narration moved
    above the editor.
- Editing the code after a run freezes the picture (it belongs to the old code) until the next run.

## 2026-11-20 — v1.2.0, floating hints + Tab
- Strip shows only the line with the values filled in (`['G01', 'G02', 'G03'].append('G04')`) — user: the original was too long.
- Labels above and the strip below now float over the neighbouring lines instead of pushing the code apart (user wanted
  to see if it looks nicer); fixed pixel size at any code zoom; Ctrl+wheel never zooms the whole window.
- Bug (user's screenshot): labels on one line overlapped (long file value + new value) → labels that would overlap move
  up a row (`declutter` in editor.js); file values show as `📄 name`. Labels no longer stay faded after their value flies.
- Tab accepts the highlighted autocomplete suggestion when the list is open (like VS Code), otherwise indents.

## 2026-11-20 — v1.3.0, Library (คลัง) + cut label fix
- Bug (user's screenshot): a value label on a short name near the left edge (`f` → `📄 pet_grooming.txt`) slid under
  the line numbers and was cut. Labels are now nudged right (or left at the right edge) to stay inside the code area;
  the nudge is redone after every editor update because CodeMirror can rebuild a label (`declutterAfter` plugin).
- Library (คลัง), asked by the user: every .py opened / dropped from the PC and every document written in the app is
  kept in the Library (user picked "files + my own work"). Nested folders, 30 px rows (user: not tall), click = open,
  double-click = rename, right-click menus, delete file (confirm) / delete folder (contents move out, Undo). Drag a
  file / folder into a folder like Prism Cam's layer drag (card lifts, pill says what happens, flies in, the folder
  gulps it; Esc cancels; resting on a closed folder opens it); dropping on the editor opens the file.
- Shown in two places: a new "Library" tab on the right of the code page (Ctrl+Shift+E) and the Problems page, now
  "Problems / Library" with two tabs.
- User-picked extras: search (names + code, the matching line is shown), drag to the editor, save a whole folder (or
  the whole Library) to a folder on the PC (new `pick_dir` + `fs_write_tree`; data .txt files go next to their .py),
  and a name rail on the right like Prism Rec's date rail (ticks per folder / first letter / problem set).
- BU Final can be removed from the Problems page (hidden, progress kept; Undo toast + "bring back" button at the bottom).
- Right tabs: with 4 tabs a narrow panel shows only the active tab's word (container query).
- Tested in the exe (v1.3.0, built 06:26): label at the `f.close()` step, Library tab EN / dark, Library page TH /
  light. Drag into a folder, rail hover, BU Final remove / restore tested in the browser preview. Not tested: the
  Windows folder picker for "save folder to PC" (needs a click in the dialog).

## 2026-11-20 — v1.4.0, Library: select many, rubber band, Ctrl+Z, folder guide lines
- Asked by the user, for the Library on both the code page's right tab and the Problems / Library page:
  - select several: Ctrl+click (add / remove), Shift+click (range), drag a rubber band on the empty space under the
    rows (Ctrl / Shift keeps the old selection; the list scrolls when the band reaches an edge), Ctrl+A;
  - the selection moves together (stacked cards + count badge, same drag animation), right-click menu for several
    (put in new folder, move out, save the selection to the PC, delete), Delete key, F2 rename, Esc clears;
  - Ctrl+Z / Ctrl+Y (also Ctrl+Shift+Z) undo / redo every library change: new folder / file, rename, duplicate, move,
    delete (a deleted file comes back with its code). Works when the cursor is not in the editor or a box (so Ctrl+Z
    in the code still undoes typing); the "Undo" buttons on toasts use the same stack;
  - faint vertical guide lines under every open folder (one per nesting level) showing which files belong to it.
- Fold state of folders is not part of undo. Opening / editing a file is not recorded.
- Added test hook `libdel:<name>` (see LESSONS #5): test files had been written into the user's real library by my exe
  tests; removed them and checked that only the user's own files are left.
- Tested: browser preview (Ctrl / Shift click, rubber band, multi-move, Ctrl+Z, delete + Ctrl+Z, Ctrl+A, Esc) and the
  exe v1.4.0 (looks, guide line, dark mode). Not tested by hand in the exe: dragging with the real mouse.
