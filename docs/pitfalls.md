# Prism Code — pitfalls

- **Python's `sum()` ≠ JavaScript's sum.** Python 3.12+ uses compensated summation, so a JS-computed average was off by
  0.01 in 1 of 300 generated problems. Generated samples are filled from the answer's real run (`gen.js finalize`).
- **Can't `rmtree` the current directory in Pyodide** (`OSError: [Errno 10] Resource busy: '/work'`). `reset_work` empties
  the folder's contents instead.
- **A generated variable named `pass`** (from the level name "Pass") is a SyntaxError. Count variables are `<level>_count`.
- **`StopIteration` shows up as an "exception" step** at the end of every `for line in file` loop (PrismFile.__next__).
  Ignored in the tracer, like GeneratorExit.
- **Viz `pause()` resets the slider** (onStep → updateVizBar): read the slider value *before* pausing.
- **The console is re-rendered per step** during playback: the traceback / Thai explanation live in `conTail` and are
  re-appended only at the last step.
- **Error mark spoilers:** the red line is set by the stage only once the playback reaches the exception step.
- **`python` on this PC is the Microsoft Store alias** — calling it from Git Bash hangs. Test Python code with Pyodide in
  Node (`PrismCodeBuild\test\t1.mjs`).
- Pyodide's loader uses `eval` for EM_ASM → the CSP has `'unsafe-eval' 'wasm-unsafe-eval'` (everything is local).
- The Bash tool's heredoc mangles `\` (regexes, CSS escapes): write such files with the Write tool.
- **Labels above code need room:** the running line gets `padding-top` (`.v-haslab`) and the strip is a *block* widget
  under it. Both change the layout, so flights are computed only after the line is painted, and the line moves on only
  after the values have landed (phase 1 fly → phase 2 land → phase 3 next line).
- **`ch` inside the label** would be the label's own (smaller) font: the zero-width wrapper `.v-labw` takes the token width
  in the code font, the label centres on it.
- The tracer records the call step at the `def` line and, after a return, the next line event is the line *after* the
  call — the call site comes from the matching call step's `fromLn` (`callOf`).
- **CodeMirror keeps a widget's DOM when `eq()` says it's the same** — classes added by hand (e.g. `go` on a label) stay
  on the next paint. Animations added that way must end in the normal look.
- Floating labels on line 1 need room: `.cm-content` has 24 px top padding.
- **A label near the left edge is cut by the line numbers.** Labels are centred on their name; `declutter` nudges
  them inside the code area with margin-left (not transform — labIn animates transform). Measure with offsetWidth +
  the wrapper rect, not the label's rect (it may still be scaling in). CodeMirror can rebuild a label after the
  nudge, so a ViewPlugin redoes it after every update.
- **The browser preview pane can be hidden** → requestAnimationFrame never fires there; anything done in rAF (label
  nudge, rail build) looks broken in the preview. Check `tabs_context` or verify in the exe.
- Library membership is computed (`inLib`: no problem ref and lib flag / path / code), not a separate list — so a
  file can't get out of sync with its document. `closeDoc` must not throw away an empty doc with `lib: true`.
- Bash `node -e "…"` with backticks inside double quotes runs them as commands (docs lost their code names) — write
  docs with the Write / Edit tools.
- **The exe uses the user's real saved data** (their library showed beside my test files). Data-creating test hooks need a matching cleanup (`libdel:<name>`); see suite LESSONS #5.
- Rubber band: update the selection in pointermove, not only in requestAnimationFrame (a hidden preview pane never fires rAF); the frame loop is only for auto-scroll at an edge.
- Library undo records a diff (folders + the touched files) in `record()`; a blank tab that `removeDoc` opens is ignored, fold state is kept when folders are restored.
- **A bare `except:` catches our BaseException signals** (NeedInput / TooSlow / TooManySteps). `tracer.guarded()` inserts
  `__prism_guard__()` first in every except body; keep it when changing how the code is compiled.
- **Comprehensions fire a "line" event per item** → merged in `tracer()` (same line, same frame, no effects); `for` / `while`
  headers are not merged.
- **`ACT code:` edits the ACTIVE doc of the user's real data** — never use it in the exe without restoring the doc.
- Saved data (`prism.code.v1`) skips `files` entries over 300 K chars; the page's storage limit is ~5 M chars total.

- **Changed icon not in the exe** (2026-11-21): tauri-build does not rerun when `icons/icon.ico` changes → `touch app/src-tauri/build.rs` before building. Icons come from `../tools/brand` (see `../docs/brand.md`).
- **Anything that animates under / inside the glass panels costs real CPU + GPU** (backdrop-filter re-blurs every
  frame): idle Prism Code used 1.3–1.8 cores. Decorative endless animations must be in the `html.idle` list
  (`code.css`); the WebGL background stops by itself (`bg.js` idle). Measure with `PrismCodeBuild	est\perf.ps1`
  (CPU / memory / GPU of the app's process tree) after ~15 s without touching the mouse.
- **Big results freeze the page** (structured clone + viz of 100+ MB) → white window. Keep the step recording small
  (`SER_MAX`, `STACK_MAX`); `watch_page()` reloads a crashed / hung page and logs `WEBVIEW FAILED`.
- **Test the exe with its own profile**: `WEBVIEW2_USER_DATA_FOLDER=%USERPROFILE%\PrismCodeBuild	est\wv2` + `PRISM_MULTI=1`
  → hooks like `code:` can't touch the user's real library. Stop only your own copy by PID (never every prism-code.exe).
- **Classic look (light) shows white-on-white boxes** → old light styles paint wells with translucent white over glass; on a solid white panel they vanish → add the class to the `html[data-look=classic]:not([data-theme=dark])` list at the end of this app's CSS (`var(--c-fill)` / `var(--c-hover)`). Test hooks must press `#theme-pop [data-look=…]`, never `[data-look=…]` (`<html>` carries the same attribute).

- **Keyboard sounds** (`keysound.js`): CodeMirror / the browser preview's "type" action inserts text without key events — test with real key presses (`key` action) and count `AudioBufferSourceNode.start`. The menu sits over the dark editor: a see-through glass turns grey there, so `.sound-pop` has its own near-solid background. `"ปิด"` already means "Close" in lang-en → the menu uses `ปิดเสียง` / `เปิดเสียง`. Test hooks `soundpick:` / `sound:demo` play out loud on the user's speakers — keep them short. The AudioContext suspends after 6 s without sound (idle CPU).
