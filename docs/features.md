# Prism Code — features

## Workspace (เขียนโค้ด)
- **Editor** that looks like VS Code Dark Modern + Pylance: functions / methods yellow, `if/for/return/import` purple,
  `def/True/and/self` blue, `int/str/range` and imported modules teal, variables light blue, strings orange, numbers
  green, f-string braces blue, rainbow brackets (gold → orchid → blue), indent guides, Consolas. Tabs like VS Code.
  Autocomplete (keywords, built-ins, names in the file, `.append/.split/...` after a dot), Thai hover help on built-ins,
  Ctrl+/ comment, Alt+↑/↓ move line, Ctrl+D, multi-cursor, search. Font size Ctrl+= / Ctrl+- / Ctrl+wheel (remembered).
- **Big code area**: problem pane hides with Ctrl+B; Ctrl+Alt+B hides both side panels; splitters for every pane.
- **F5 Run** — output in a VS Code-style terminal; `input()` is typed right in the terminal. Errors show the Python
  traceback plus a **Thai explanation** (what happened / why / what to try, "go to line"), and a red squiggle on the line.
- **F6 Step by step** — happens inside the code (v1.1): labels above the names on the running line (blue = read,
  pink = just stored, purple = parameter), values float from label to the receiving name, a substitution strip under the
  line (`amount * 0.90 → 2500.0 * 0.90 → 2250.0`), faint `name = value` / `→ True` after lines that ran, calls fly
  arguments up to `def` and returns fly back down, spotlight fades other lines, hover a name = its value history
  (click to jump). Play bar + Thai narration sit above the editor; ~2.5 s per line at 1×.
- **Values panel** (right, Ctrl+J hides it) — summary of the same run:
  - every variable is a glass box (lists as cells with indices, files as file chips);
  - when a line runs, the values it reads float out of their boxes (single cells for `parts[1]`) with a glowing trail
    and sink into the box that receives the result, which "absorbs" with a pop;
  - calling a function slides a new card in; arguments fly into the parameters; `return` shows a badge and the value
    flies back to the caller while the card fades out;
  - `print` sends the text to the terminal, `input` brings the typed text into its variable, file writes fly into a file
    card that fills line by line ("w" empties it, "a" appends), reads fly out of the highlighted line;
  - narration in Thai for every step (`if` → True/False and which way it goes, `for` next value, etc.);
  - play / pause (F7 / Space), step (F10 / →), back (Shift+F10 / ←), slider, speed 0.35×–4×; current line yellow,
    previous line green in the editor; the error line turns red only when the playback reaches it.
- **Ctrl+Enter Check answer** — runs the code on every test case (hidden edge values included), compares screen output
  and the files the program must write character by character (spaces shown as ·), pairs the differing lines and marks
  the changed characters; trailing spaces don't fail but are pointed out; forgotten `close()` is pointed out; "watch this
  case step by step".
- **Predict first** toggle: before showing the output, asks for the inputs (output hidden), then "what will it print?",
  compares, and offers to watch why.
- **Files tab** — the folder `open()` sees: problem data files, files the program wrote (they stay, like a real disk),
  new / edit / rename / delete / import from PC / save to PC / reset to the problem's files.
- Open .py (also loads the .txt files from the same folder), save as .py (Ctrl+S), drag & drop .py / .ipynb / .txt.

## Library (คลัง)
- Every .py opened / dropped from the PC and every document written in the app (not problems) — `lib.js`, data
  `S.folders` + `doc.lib` / `doc.folder`. Two views: right tab "Library" on the code page (Ctrl+Shift+E) and the
  "Library" tab of the Problems / Library page.
- Folders (nested), 30 px rows, click = open, double-click = rename, right-click = menu (new file / sub-folder, rename,
  duplicate, move out, save .py, save whole folder to PC, delete). Deleting a folder moves its contents out (Undo).
- Drag like Prism Cam layers: into a folder, out to the top, onto the editor (= open); Esc cancels.
- Select many: Ctrl+click, Shift+click, drag a rubber band on empty space, Ctrl+A; move / delete / save them together; Delete, F2, Esc.
- Ctrl+Z / Ctrl+Y undo / redo for every library change (not while the cursor is in the editor or a text box).
- Faint vertical guide line under each open folder (per nesting level).
- Search box (file names + code; shows the matching line and the folder), Enter opens the first hit.
- Name rail on the right (Prism Rec's date rail, `rail.js`): a tick per folder / first letter (problem set on the
  Problems tab); hover = name + glide there, drag = scroll.

## Problems (โจทย์)
- BU Final (and imported sets) can be removed with the bin icon; BU Final is only hidden (`S.hiddenPacks`) and comes
  back from the button at the bottom of the page.
- **BU Final** — the user's CS102 review notebook: 4 problems, statement as written, 3–8 hidden tests each (exactly
  1000 / 5000, 120 minutes, 2.0 / 1.2 litres, an old lab_usage.txt that must be overwritten, quantity 0 …), a correct
  answer (behind "Show answer", with "watch the answer step by step"), and the user's first answers as **find the bug**
  exercises (name / student ID removed) with hints revealed one by one.
- **Generate** new exam-style problems: function + if tiers (4 stories), write a file in a loop (4), read a file → list →
  3 groups + stats (4), 3 functions + split + report (4). New numbers every time, answer + tests included; the sample
  output in the text is the answer's real output.
- **Open .ipynb** → a problem set: each "ข้อที่ / Problem" heading becomes a problem with its code cells (first = your
  code, others = "version 2…"), sample input files go to the Files tab, the sample console output and expected output
  files become the check (input() answers are read from the sample by matching the prompt).
- Progress per problem (passed / last score) on the cards and editor tabs.

## Predict quiz (ทายก่อนรัน)
- 17 kinds of short programs (variables, / // %, if / and-or, for / while / nested, functions / scope, lists, f-string
  decimals and padding, split, write+read a file, "w" vs "a"); topic filter; score, streak, best streak; open in the
  editor or watch step by step.

## Shell
- Light on the PC: after 8 s without mouse / keyboard, or when another window is in front, the moving background
  and the decorative shimmer stop (a running step-by-step keeps playing); the first mouse move wakes them.
- If the page crashes or hangs (white window), it reloads itself; the work is already saved.
- Prism suite shell: title bar, TH / EN, appearance menu on the moon/sun button (Light/Dark + Glass/Classic; Classic = flat, still, no refraction), About + GitHub updater (repo not set yet), shortcuts page (F1).
- Python status in the title bar (Pyodide 3.14, loads in ~2 s, fully offline). Endless loops stop after 1.5 M lines or
  12 s; Shift+F5 stops at any time.
