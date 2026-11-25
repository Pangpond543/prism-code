# Prism Code — changelog

## 2026-11-26 — v1.6.0 released (keyboard sounds). Notes TH + EN in `docs/release-notes-1.6.0.md`; Setup + Portable from `tools/release.sh`.

## 2026-11-24 — keyboard sounds ("เสียงคีย์บอร์ดเวลาพิมพ์ ให้เลือกได้หลากหลาย เหมือนจำลองสวิตช์คีย์บอร์ดต่างๆ")
- New speaker button on the editor bar (`#btn-sound`) → menu: on / off, volume, 12 simulated switches (Blue, Box Jade,
  Brown, Panda, Red, Black, Creamy, Silent, Topre, Buckling spring, Laptop, Typewriter), a box to try typing. Picking a
  switch turns sound on and plays a short typing demo. Ctrl+Alt+M = quick on / off (toast). Off by default.
- Why synthesised, not recorded: offline, no files, no licence questions. `js/keysound.js` renders each switch once
  (~15–100 ms) into 6 takes × 4 key kinds (key / wide / Enter / Space) × press + release: click jacket, tactile bump,
  bottom-out noise burst, keycap / case resonances, spring ping, stabiliser rattle on long keys; typewriter has its own
  model (escapement, carriage return + bell on Enter).
- Realism details: release sound on keyup, a held key repeats silently, never the same take twice in a row, slight
  pitch + level variation, rows pitched a little differently, left keys pan left / right keys right, small desk reverb,
  compressor so fast typing does not clip. The audio thread suspends 6 s after the last sound (idle CPU measured 0.8 %).
- Verified in `appinprism-code.exe` (START log exe_mtime = build): menu screenshot, self-test renders all 12 switches,
  real mouse pick + real key presses in the preview (5 keys → 5 press + 5 release sounds), Ctrl+Alt+M, TH / EN, dark.

## 2026-11-23 — "the app freezes, the whole window goes white, and the PC gets slow while it's open" (a friend's report)
- 🔴 **White window**: v1.4.0 sent the whole step recording to the page in one go. Measured with the old tracer:
  infinite recursion = 75 MB, a 60×60 list changed in a loop = 220 MB (14 s). The page froze / ran out of memory
  and WebView2 left the window white. Now ≤ ~10 MB (`SER_MAX` 400 000 values, `STACK_MAX` frames, see 2026-11-20).
- 🔴 **White window never came back**: nothing handled a crashed / hung page. `main.rs watch_page()` listens to
  WebView2 `ProcessFailed`: page exited / not responding → log `WEBVIEW FAILED: …` + reload (max 5 per session);
  the whole WebView2 gone → restart the app. Tested: killed the page process of a test copy → reloaded in 0.5 s,
  Python ready again, window normal (screenshot).
- 🟠 **PC slow while the app is open**: idle (nothing happening) the app used ~1.3–1.8 CPU cores + ~18 % GPU: the
  WebGL background at 24 fps and ~12 endless CSS loops (button shimmer, TH/EN switch, logo swing, status dot) — each
  frame the glass panels re-blur what is behind them. Now `bg.js` goes idle after 8 s without mouse / keyboard or
  when another window has focus: the background stops on its last picture and `html.idle` pauses those loops
  (`code.css`). Measured idle: ~1–4 % CPU, 0 % GPU. Opening: ~1.2 cores for the first ~6 s (Python loading), then 0.
  The step-by-step animation is not paused (checked: still playing 20 s after the last input). The logo swing
  rests while idle (alone it cost ~1 core + 12 % GPU) and moves again with the first mouse move.
- v1.5.0 also carries the appearance menu + Classic look, logo v2 and the update nudge (below). **Released as v1.5.0 on GitHub 2026-11-23** (Setup.exe + Portable.zip; notes TH + EN in `docs/release-notes-1.5.0.md`). Note: an earlier line here said "released" before it really was — `gh release list` is the proof.

- 2026-11-23 — **Appearance menu + Classic look** (suite-wide, design approved on Prism Size). The moon/sun button opens a small menu: Theme (Light / Dark) and Style (Glass / Classic). Classic = flat solid panels on a plain background (Discord-like greys), no moving background, no refraction / blur / glints, no decorative looping animation or hover bounce; status indicators still move. — user wanted a calm, use-focused mode.
- 2026-11-23 — Title-bar logo: outer square swings again (with the other two) and the glyph is ~25 % smaller. — user review.
- 2026-11-22 — **Logo v2** (user review): app icon = the layered tile at every size (no plain small version) with a bigger glyph; title-bar logo = squares + glyph with no tile, 26 → 44 px, outer square still. — user wanted the big icon everywhere and a much bigger logo in the bar.
- 2026-11-21 — **Own logo + "by 543" + update nudge** (suite-wide). Logo keeps the Prism family shape but now has this app's colour and a white </> glyph (title bar, About, exe/taskbar icon; generated from `tools/brand/`). Faint "by 543" after the name in the title bar (the user's personal mark). Quiet update check 4 s after start (+ every 6 h): newer version → pink dot with ripple on the Info button and a glass chip "New version vX · Update" sliding out once per version; clicking opens Info already on "Update now". Test hook: `updfake`. — user: logos all looked the same, wanted 543 visible, and an eye-catching update hint.

## 2026-11-20 — bug hunt (rebuilt exe, still v1.4.0)
- 🟠 `input()` inside a bare `except:` (very common: `try: int(input()) except: print("bad")`) never asked the user: the
  `except:` swallowed our internal NeedInput signal and the program looped until the 1.5 M-step limit. `tracer.py` now
  puts a guard call at the top of every `except` block (`guarded()`), so the signal always gets through.
- 🟠 Opening a .py from a busy folder (e.g. Downloads) pulled up to 30 .txt files into the document and into the saved
  data (one real doc had 640 KB; localStorage holds ~5 M chars → saving would start failing). Now files the code names
  come first, others only if ≤ 64 KB, 1 MB total; files > 300 K chars are never saved (kept for the session);
  the "cannot save" toast shows at most once per 30 s.
- 🟠 `print("x" * 50_000_000)` sent the whole string to the page; output is cut at 200,000 chars with a note (`outCut`).
- 🟠 Infinite recursion took 5–10 s to report and a huge traceback: steps keep only the global frame + 23 innermost
  frames (`STACK_MAX`), traceback shows "[Previous line repeated N more times]", ~1 s now. A WebAssembly stack overflow
  (after `sys.setrecursionlimit(100000)`) is reported as RecursionError and the worker is restarted (any `fail` restarts Python).
- 🟠 A comprehension like `[[i*j for j in range(60)] for i in range(60)]` fired the same line thousands of times and
  used the whole 2500-step budget on line 1 → repeated same-line events are merged; also a total value budget (`SER_MAX`).
- Checked, no change needed: Thai identifiers / strings, recursion + exception steps, Stop / respawn, offline Pyodide
  (embedded in exe), BU Final tests, 300 generated problems (sample == real output), clippy (4 style warnings only),
  English entries for all new strings.
- Mistake: my test hook `code:` overwrote the code of the user's real library file `gemini-code-….py` (the exe shares real
  data). Restored from the file in Downloads. Use the browser preview for tests that edit code.
- Not verified in the exe by eye: the Run button flow with the new tracer (checked in the browser preview + Node; the exe
  boots, Python ready, exe timestamp = build).

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
