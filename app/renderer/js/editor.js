// Prism Code — the code editor. CodeMirror 6 painted exactly like VS Code "Dark Modern" + Pylance colouring:
// functions / methods yellow, if-for-return purple, def / True / and blue, int / str / range teal, variables light blue,
// strings orange, numbers green, rainbow brackets (gold → orchid → blue), indent guides, Consolas.
import * as CM from '../vendor/cm.js';
import { T } from './i18n.js';

const { EditorState, StateField, StateEffect, EditorView, Decoration, ViewPlugin, WidgetType, keymap, syntaxTree, Compartment, GutterMarker, gutter } = CM;

/* ------------------------------------------------------------------ word lists */
export const BUILTIN_CLASSES = new Set(['int', 'float', 'str', 'list', 'dict', 'tuple', 'set', 'bool', 'range', 'enumerate', 'zip', 'map', 'filter',
  'reversed', 'object', 'type', 'frozenset', 'bytes', 'bytearray', 'slice', 'super', 'property', 'complex', 'memoryview', 'staticmethod', 'classmethod',
  'Exception', 'BaseException', 'ValueError', 'TypeError', 'NameError', 'IndexError', 'KeyError', 'ZeroDivisionError', 'FileNotFoundError', 'IOError',
  'OSError', 'RuntimeError', 'AttributeError', 'StopIteration', 'ArithmeticError', 'LookupError', 'ImportError', 'NotImplementedError', 'AssertionError']);
export const BUILTIN_FUNCS = new Set(['print', 'input', 'len', 'sum', 'max', 'min', 'open', 'round', 'abs', 'sorted', 'isinstance', 'id', 'chr', 'ord', 'pow',
  'divmod', 'any', 'all', 'iter', 'next', 'hash', 'hex', 'bin', 'oct', 'format', 'repr', 'vars', 'dir', 'help', 'globals', 'locals', 'eval', 'exec',
  'callable', 'getattr', 'setattr', 'hasattr', 'delattr', 'issubclass', 'ascii', 'breakpoint', 'compile', 'exit', 'quit']);
const CONTROL = new Set(['if', 'elif', 'else', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'finally', 'raise', 'break', 'continue',
  'pass', 'with', 'yield', 'await', 'assert', 'del', 'match', 'case']);
const BLUEKW = new Set(['def', 'class', 'lambda', 'and', 'or', 'not', 'is', 'global', 'nonlocal', 'None', 'True', 'False', 'async', 'type']);
const OPS = new Set(['ArithOp', 'CompareOp', 'AssignOp', 'UpdateOp', 'BitOp', 'LogicOp', '*', '**', '@']);
const COMPREHENSIONS = new Set(['ComprehensionExpression', 'ArrayComprehensionExpression', 'DictionaryComprehensionExpression', 'SetComprehensionExpression']);

/* --------------------------------------------------------- semantic colouring */
const mk = {};
const mark = (c) => (mk[c] || (mk[c] = Decoration.mark({ class: 'v-' + c })));
const PLACE = /\{[\w.\[\]]*(![rsa])?(:[^{}]*)?\}|%[-+0 #]*(\d+|\*)?(\.\d+)?[sdifrxXeEgGc%]/g;

function paint(state) {
  const tree = syntaxTree(state);
  const doc = state.doc;
  const text = (n) => doc.sliceString(n.from, n.to);
  const out = [];
  const add = (from, to, c) => { if (to > from) out.push(mark(c).range(from, to)); };
  // names the program defines / imports (Pylance colours those by kind)
  const defs = new Set(), classes = new Set(), modules = new Set();
  tree.iterate({
    enter(n) {
      if (n.name === 'VariableName') {
        const p = n.node.parent;
        if (p && p.name === 'FunctionDefinition') defs.add(text(n));
        else if (p && p.name === 'ClassDefinition') classes.add(text(n));
        else if (p && p.name === 'ImportStatement') modules.add(text(n));
      }
    },
  });
  let depth = 0;
  tree.iterate({
    enter(n) {
      const name = n.name, p = n.node.parent, pn = p ? p.name : '';
      switch (name) {
        case 'Comment': add(n.from, n.to, 'comment'); return false;
        case 'String': {
          // prefix letters (f r b u) blue, the rest orange, format placeholders blue, escapes gold
          const s = text(n), m = /^[A-Za-z]{0,2}/.exec(s)[0];
          add(n.from, n.from + m.length, 'kw');
          add(n.from + m.length, n.to, 'str');
          if (!/r/i.test(m)) for (const e of s.matchAll(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|N\{[^}]*\}|[0-7]{1,3}|.)/g)) add(n.from + e.index, n.from + e.index + e[0].length, 'esc');
          for (const e of s.matchAll(PLACE)) if (e[0] !== '%%') add(n.from + e.index, n.from + e.index + e[0].length, 'kw');
          return false;
        }
        case 'FormatString': {
          const s = text(n), m = /^[A-Za-z]{0,2}/.exec(s)[0];
          add(n.from, n.from + m.length, 'kw');
          add(n.from + m.length, n.to, 'str');
          for (const e of s.matchAll(/\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|[0-7]{1,3}|.)/g)) add(n.from + e.index, n.from + e.index + e[0].length, 'esc');
          return; // children (replacements) are painted on top
        }
        case 'FormatReplacement': {
          // braces blue, the expression in normal colours (painted by its own children)
          add(n.from, n.from + 1, 'kw');
          add(n.to - 1, n.to, 'kw');
          add(n.from + 1, n.to - 1, 'plain');
          return;
        }
        case 'FormatSpec': case 'FormatConversion': case 'FormatSelfDoc': add(n.from, n.to, 'kw'); return false;
        case 'Escape': add(n.from, n.to, 'esc'); return false;
        case 'Number': add(n.from, n.to, 'num'); return false;
        case 'Boolean': case 'None': add(n.from, n.to, 'kw'); return false;
        case 'print': {
          add(n.from, n.to, 'fn'); return false;
        }
        case 'in': {
          const ctl = pn === 'ForStatement' || COMPREHENSIONS.has(pn);
          add(n.from, n.to, ctl ? 'ctl' : 'kw'); return false;
        }
        case 'if': case 'else': add(n.from, n.to, 'ctl'); return false;
        case 'VariableName': {
          const t = text(n);
          let c = 'var';
          if (pn === 'FunctionDefinition') c = 'fn';
          else if (pn === 'ClassDefinition') c = 'cls';
          else if (pn === 'Decorator') c = 'fn';
          else if (pn === 'CallExpression' && p.firstChild && p.firstChild.from === n.from) c = (BUILTIN_CLASSES.has(t) || classes.has(t)) ? 'cls' : 'fn';
          else if (t === 'self' || t === 'cls') c = 'kw';
          else if (modules.has(t) || classes.has(t) || BUILTIN_CLASSES.has(t)) c = 'cls';
          else if (defs.has(t) || BUILTIN_FUNCS.has(t)) c = 'fn';
          else if (/^[A-Z][A-Z0-9_]+$/.test(t)) c = 'const';
          add(n.from, n.to, c);
          return false;
        }
        case 'PropertyName': {
          const me = p; // MemberExpression
          const call = me && me.parent && me.parent.name === 'CallExpression' && me.parent.firstChild && me.parent.firstChild.from === me.from;
          add(n.from, n.to, call ? 'fn' : 'var');
          return false;
        }
        case '(': case '[': case '{':
          if (pn === 'FormatReplacement') return false;
          add(n.from, n.to, 'b' + (depth % 3)); depth++; return false;
        case ')': case ']': case '}':
          if (pn === 'FormatReplacement') return false;
          depth--; add(n.from, n.to, depth < 0 ? 'bad' : 'b' + (depth % 3)); if (depth < 0) depth = 0; return false;
        case '⚠': add(n.from, n.to, 'plain'); return false;
        default:
          if (CONTROL.has(name)) { add(n.from, n.to, 'ctl'); return false; }
          if (BLUEKW.has(name)) { add(n.from, n.to, 'kw'); return false; }
          if (OPS.has(name)) { add(n.from, n.to, 'op'); return false; }
      }
    },
  });
  return Decoration.set(out, true);
}

const semantic = ViewPlugin.fromClass(class {
  constructor(view) { this.decorations = paint(view.state); this.tree = syntaxTree(view.state); }
  update(u) {
    const t = syntaxTree(u.state);
    if (u.docChanged || t !== this.tree) { this.tree = t; this.decorations = paint(u.state); }
  }
}, { decorations: (v) => v.decorations });

/* ------------------------------------------------------------ indent guides */
function guides(view) {
  const b = [];
  const doc = view.state.doc;
  const ind = (ln) => { const s = doc.line(ln).text; if (!s.trim()) return -1; return s.match(/^ */)[0].length; };
  for (const { from, to } of view.visibleRanges) {
    let ln = doc.lineAt(from).number;
    const last = doc.lineAt(to).number;
    for (; ln <= last; ln++) {
      let n = ind(ln);
      if (n < 0) { // blank line: as deep as the lines around it
        let a = ln - 1, z = ln + 1, na = 0, nz = 0;
        while (a >= 1 && (na = ind(a)) < 0) a--;
        while (z <= doc.lines && (nz = ind(z)) < 0) z++;
        n = Math.min(a >= 1 ? na : 0, z <= doc.lines ? nz : 0);
        if (z <= doc.lines && nz > na) n = na + 4 <= nz ? na + 4 : na; // inside a block that continues
      }
      const lv = Math.floor(n / 4);
      if (lv > 0) b.push(Decoration.line({ attributes: { style: `--ig:${lv}` }, class: 'v-ig' }).range(doc.line(ln).from));
    }
  }
  return Decoration.set(b);
}
const indentGuides = ViewPlugin.fromClass(class {
  constructor(v) { this.decorations = guides(v); }
  update(u) { if (u.docChanged || u.viewportChanged) this.decorations = guides(u.view); }
}, { decorations: (v) => v.decorations });

/* ------------------------------------------ run marks: current line, error */
const setMarks = StateEffect.define();
const marksField = StateField.define({
  create: () => ({ exec: 0, prev: 0, err: 0, errMsg: '', hits: null }),
  update(v, tr) {
    for (const e of tr.effects) if (e.is(setMarks)) v = { ...v, ...e.value };
    if (tr.docChanged && (v.exec || v.err)) v = { ...v, exec: 0, prev: 0, err: 0 }; // editing = the run no longer matches
    return v;
  },
});
const lineDeco = (c) => Decoration.line({ class: c });
const marksDeco = EditorView.decorations.compute([marksField], (state) => {
  const m = state.field(marksField), b = [];
  const ok = (n) => n > 0 && n <= state.doc.lines;
  const ranges = [];
  if (ok(m.prev) && m.prev !== m.exec) ranges.push([m.prev, 'v-prev']);
  if (ok(m.exec)) ranges.push([m.exec, 'v-exec']);
  if (ok(m.err)) ranges.push([m.err, 'v-errline']);
  ranges.sort((a, z) => a[0] - z[0]);
  for (const [n, c] of ranges) b.push(lineDeco(c).range(state.doc.line(n).from));
  if (ok(m.err)) {
    const l = state.doc.line(m.err), s = l.text.search(/\S/);
    if (s >= 0) b.push(Decoration.mark({ class: 'v-squiggle', attributes: { title: m.errMsg || '' } }).range(l.from + s, l.to));
  }
  return Decoration.set(b, true);
});
class ArrowMarker extends GutterMarker { constructor(c) { super(); this.c = c; } toDOM() { const s = document.createElement('span'); s.className = this.c; return s; } }
const runGutter = gutter({
  class: 'v-rungutter',
  lineMarker(view, line) {
    const m = view.state.field(marksField), n = view.state.doc.lineAt(line.from).number;
    if (n === m.err) return new ArrowMarker('v-g-err');
    if (n === m.exec) return new ArrowMarker('v-g-exec');
    return null;
  },
  lineMarkerChange: (u) => u.transactions.some((t) => t.effects.some((e) => e.is(setMarks))) || u.docChanged,
  initialSpacer: () => new ArrowMarker('v-g-exec'),
});

/* ------------------------------- the step-by-step picture inside the code */
// labels: small value chips sitting above a token (line, from, len = offsets in the line) · eol: faint text after the
// end of a line (last values, like VS Code's inline values) or the orange "substitution" strip on the current line ·
// spotlight: other lines fade, lines that never run fade more.
const setInline = StateEffect.define();
class LabelWidget extends WidgetType {
  constructor(html, cls, len) { super(); this.html = html; this.cls = cls; this.len = len; }
  eq(o) { return o.html === this.html && o.cls === this.cls && o.len === this.len; }
  toDOM() {
    const w = document.createElement('span');
    w.className = 'v-labw';
    w.style.setProperty('--len', this.len);
    const s = document.createElement('span');
    s.className = 'v-lab ' + this.cls;
    s.innerHTML = this.html;
    w.appendChild(s);
    return w;
  }
  ignoreEvent() { return true; }
}
class EolWidget extends WidgetType {
  constructor(html, cls, indent = -1) { super(); this.html = html; this.cls = cls; this.indent = indent; }
  eq(o) { return o.html === this.html && o.cls === this.cls && o.indent === this.indent; }
  toDOM() {
    const s = document.createElement('span'); s.className = 'v-eol ' + this.cls; s.innerHTML = this.html;
    if (this.indent < 0) return s;
    // the strip floats just under the line, over the next line (it does not push the code down)
    const d = document.createElement('span'); d.className = 'v-stripw'; d.appendChild(s); return d;
  }
  ignoreEvent() { return true; }
}
function buildInline(state, v) {
  const b = [], doc = state.doc;
  const ok = (n) => n >= 1 && n <= doc.lines;
  for (let n = 1; n <= doc.lines; n++) {
    const cls = [];
    if (v.dim && v.cur && n !== v.cur && !(v.keep || []).includes(n)) cls.push(v.unrun && v.unrun.has(n) ? 'v-unrun' : 'v-dim');
    if (cls.length) b.push(Decoration.line({ class: cls.join(' ') }).range(doc.line(n).from));
  }
  for (const x of v.labels || []) {
    if (!ok(x.line)) continue;
    const l = doc.line(x.line);
    b.push(Decoration.widget({ widget: new LabelWidget(x.html, x.cls || '', x.len || 1), side: -1 }).range(Math.min(l.to, l.from + x.from)));
  }
  for (const x of v.eol || []) {
    if (!ok(x.line)) continue;
    const l = doc.line(x.line);
    if (x.cls === 'strip') b.push(Decoration.widget({ widget: new EolWidget(x.html, x.cls, 0), side: -1 }).range(l.from + Math.max(0, l.text.search(/\S|$/))));
    else b.push(Decoration.widget({ widget: new EolWidget(x.html, x.cls || ''), side: 1 }).range(l.to));
  }
  return Decoration.set(b, true);
}
const inlineField = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) if (e.is(setInline)) return buildInline(tr.state, e.value);
    return tr.docChanged ? Decoration.none : deco; // editing = the run no longer matches the code
  },
  provide: (f) => EditorView.decorations.from(f),
});
// labels on the same line that would overlap (a long value next to a short name) go up one row instead
// Labels are centred on their name; one near the left edge (a short name like `f` with a long value) would slide under
// the line numbers and be cut, so it is nudged right to stay inside the code area (and left at the right edge).
// Sizes come from offsetWidth + the wrapper, not the label's own rect: the label may still be scaling in (labIn).
function declutter(view) {
  const byLine = new Map();
  const sc = view.scrollDOM.getBoundingClientRect(), gut = view.dom.querySelector('.cm-gutters');
  const minX = (gut ? gut.getBoundingClientRect().right : sc.left) + 4, maxX = sc.left + view.scrollDOM.clientWidth - 6;
  for (const el of view.dom.querySelectorAll('.v-lab')) {
    el.style.bottom = ''; el.style.marginLeft = '';
    const line = el.closest('.cm-line');
    if (!byLine.has(line)) byLine.set(line, []);
    byLine.get(line).push(el);
  }
  for (const els of byLine.values()) {
    const items = els.map((el) => {
      const w = el.offsetWidth, pr = el.parentElement.getBoundingClientRect(), c = pr.left + pr.width / 2;
      let left = c - w / 2;
      const dx = left < minX ? minX - left : left + w > maxX ? Math.max(minX - left, maxX - (left + w)) : 0;
      if (dx) { el.style.marginLeft = dx + 'px'; left += dx; }
      return { el, left, right: left + w };
    }).sort((a, z) => a.left - z.left);
    const placed = [];
    for (const it of items) {
      let row = 0;
      while (placed.some((p) => p.row === row && it.left < p.right + 6 && it.right > p.left - 6)) row++;
      placed.push({ row, left: it.left, right: it.right });
      if (row) it.el.style.bottom = `calc(100% + ${row * 21}px)`;
    }
  }
}
// CodeMirror may rebuild a label (another decoration on the same line changes), which drops the nudge above — so it is
// redone after every update that has labels on screen (once per frame).
const declutterAfter = ViewPlugin.fromClass(class {
  constructor(view) { this.view = view; this.raf = 0; }
  update(u) { if (u.view.dom.querySelector('.v-lab')) { cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(() => declutter(u.view)); } }
  destroy() { cancelAnimationFrame(this.raf); }
});
// names on a line, with where they are (for labels and for the values flying between them)
function lineTokens(state, n) {
  if (n < 1 || n > state.doc.lines) return [];
  const l = state.doc.line(n), out = [];
  syntaxTree(state).iterate({
    from: l.from, to: l.to,
    enter(node) {
      if (node.name === 'VariableName' || node.name === 'PropertyName') {
        const p = node.node.parent;
        const call = p && ((p.name === 'CallExpression' && p.firstChild && p.firstChild.from === node.from) || (p.name === 'MemberExpression' && node.name === 'PropertyName' && p.parent && p.parent.name === 'CallExpression'));
        out.push({ name: state.doc.sliceString(node.from, node.to), from: node.from - l.from, to: node.to - l.from, prop: node.name === 'PropertyName', call: !!call, def: p && p.name === 'FunctionDefinition', param: p && p.name === 'ParamList' });
      }
    },
  });
  return out;
}

/* --------------------------------------------------- Thai hover help */
export const HELP = {
  print: ['print(ค่า, ...)', 'แสดงค่าออกทางหน้าจอ แล้วขึ้นบรรทัดใหม่ · sep= ตัวคั่น · end= ตัวปิดท้าย'],
  input: ['input("ข้อความ")', 'แสดงข้อความแล้วรอผู้ใช้พิมพ์ — ได้ค่ากลับมาเป็น str เสมอ (ต้องใช้ int() / float() แปลงก่อนคำนวณ)'],
  int: ['int(ค่า)', 'แปลงเป็นจำนวนเต็ม เช่น int("42") → 42 · int(3.9) → 3 (ตัดทศนิยมทิ้ง)'],
  float: ['float(ค่า)', 'แปลงเป็นทศนิยม เช่น float("2.5") → 2.5'],
  str: ['str(ค่า)', 'แปลงเป็นข้อความ เช่น str(10) → "10"'],
  len: ['len(สิ่งที่มีหลายช่อง)', 'นับจำนวนสมาชิก เช่น len([4, 5, 6]) → 3 · len("abc") → 3'],
  sum: ['sum(list)', 'บวกทุกค่าใน list เช่น sum([1, 2, 3]) → 6'],
  max: ['max(list)', 'หาค่ามากที่สุด เช่น max([3, 9, 2]) → 9'],
  min: ['min(list)', 'หาค่าน้อยที่สุด เช่น min([3, 9, 2]) → 2'],
  round: ['round(ค่า, ตำแหน่ง)', 'ปัดเศษ เช่น round(2.567, 2) → 2.57'],
  abs: ['abs(ค่า)', 'ค่าสัมบูรณ์ (ตัดเครื่องหมายลบ) เช่น abs(-5) → 5'],
  range: ['range(เริ่ม, หยุด, ก้าว)', 'ชุดตัวเลขสำหรับลูป — ไม่รวมตัว "หยุด" เช่น range(1, 4) → 1, 2, 3'],
  open: ['open("ชื่อไฟล์", "โหมด")', 'เปิดไฟล์ · "r" = อ่าน · "w" = เขียนทับใหม่ (ของเก่าหาย) · "a" = เขียนต่อท้าย · อย่าลืม close()'],
  sorted: ['sorted(list)', 'ได้ list ใหม่ที่เรียงจากน้อยไปมาก (reverse=True = มากไปน้อย)'],
  list: ['list(...)', 'สร้าง list — ที่เก็บหลายค่าเรียงกัน มีลำดับที่ 0, 1, 2, …'],
  enumerate: ['enumerate(list)', 'วนลูปได้ทั้งลำดับและค่า: for i, x in enumerate(lst)'],
  append: ['list.append(ค่า)', 'เพิ่มค่าต่อท้าย list'],
  split: ['ข้อความ.split()', 'แยกข้อความตามช่องว่าง ได้เป็น list เช่น "G01 S 2".split() → [\'G01\', \'S\', \'2\']'],
  strip: ['ข้อความ.strip()', 'ตัดช่องว่างและ \\n หัว-ท้ายข้อความทิ้ง — ใช้บ่อยตอนอ่านไฟล์'],
  write: ['ไฟล์.write(ข้อความ)', 'เขียนข้อความลงไฟล์ — ไม่ขึ้นบรรทัดใหม่เอง ต้องใส่ "\\n" เอง และรับได้แค่ str'],
  read: ['ไฟล์.read()', 'อ่านทั้งไฟล์ออกมาเป็นข้อความก้อนเดียว'],
  readline: ['ไฟล์.readline()', 'อ่านทีละบรรทัด (รวม \\n ท้ายบรรทัด)'],
  readlines: ['ไฟล์.readlines()', 'อ่านทุกบรรทัดออกมาเป็น list'],
  close: ['ไฟล์.close()', 'ปิดไฟล์ — ข้อมูลที่ write จะถูกบันทึกจริงตอนปิด'],
  format: ['format(ค่า, "รูปแบบ")', 'จัดรูปแบบตัวเลข เช่น format(3.14159, ".2f") → "3.14"'],
  upper: ['ข้อความ.upper()', 'เปลี่ยนเป็นตัวพิมพ์ใหญ่'], lower: ['ข้อความ.lower()', 'เปลี่ยนเป็นตัวพิมพ์เล็ก'],
  def: ['def ชื่อ(พารามิเตอร์):', 'สร้างฟังก์ชัน — โค้ดข้างในยังไม่ทำงานจนกว่าจะถูกเรียก'],
  return: ['return ค่า', 'ส่งค่ากลับไปให้คนที่เรียกฟังก์ชัน และจบฟังก์ชันทันที'],
  elif: ['elif เงื่อนไข:', 'ถ้าเงื่อนไขก่อนหน้าเป็นเท็จ ค่อยตรวจข้อนี้ — ทำแค่ทางแรกที่เป็นจริงทางเดียว'],
  while: ['while เงื่อนไข:', 'วนซ้ำตราบใดที่เงื่อนไขยังจริง — ต้องมีอะไรทำให้มันเท็จได้ ไม่งั้นวนไม่จบ'],
  for: ['for ตัวแปร in ชุดข้อมูล:', 'หยิบทีละค่าจากชุดข้อมูลมาใส่ตัวแปร แล้วทำโค้ดข้างใน'],
};
// while a run is loaded, pointing at a variable shows every value it had (click one = jump to that step)
let historyOf = null, onJump = null;
const hover = CM.hoverTooltip ? CM.hoverTooltip((view, pos) => {
  const w = view.state.wordAt(pos);
  if (!w) return null;
  const word = view.state.doc.sliceString(w.from, w.to);
  const node = syntaxTree(view.state).resolveInner(pos, 1);
  if (historyOf && node && node.name === 'VariableName') {
    const hist = historyOf(word);
    if (hist && hist.length) {
      return { pos: w.from, end: w.to, above: true, create() {
        const d = document.createElement('div'); d.className = 'v-hover v-hist';
        d.innerHTML = `<code>${word}</code><span class="hh">${T`ค่าทั้งหมดที่ ${word} เคยเป็น — กดเพื่อไปขั้นนั้น`}</span><div class="hv">${hist.map((h, k) => `${k ? '<i>→</i>' : ''}<button data-i="${h.i}" title="${T`ขั้นที่ ${h.i + 1} · บรรทัด ${h.ln}`}">${h.html}</button>`).join('')}</div>`;
        d.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b && onJump) onJump(+b.dataset.i); });
        return { dom: d };
      } };
    }
  }
  const h = HELP[word];
  if (!h) return null;
  return { pos: w.from, end: w.to, above: true, create() {
    const d = document.createElement('div'); d.className = 'v-hover';
    d.innerHTML = `<code>${h[0].replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</code><span>${T(h[1])}</span>`;
    return { dom: d };
  } };
}, { hoverTime: 450 }) : [];

/* --------------------------------------------------------- autocomplete */
const KEYWORDS = ['def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'range', 'and', 'or', 'not', 'True', 'False', 'None', 'break', 'continue',
  'pass', 'import', 'from', 'as', 'with', 'try', 'except', 'finally', 'class', 'lambda', 'global', 'is'];
const METHODS = ['append', 'split', 'strip', 'rstrip', 'lstrip', 'write', 'read', 'readline', 'readlines', 'close', 'upper', 'lower', 'replace', 'join',
  'format', 'count', 'index', 'insert', 'pop', 'remove', 'sort', 'reverse', 'extend', 'keys', 'values', 'items', 'get', 'startswith', 'endswith', 'find',
  'isdigit', 'title', 'capitalize', 'copy', 'clear', 'writelines'];
function complete(ctx) {
  const dot = ctx.matchBefore(/\.\w*/);
  if (dot) return { from: dot.from + 1, options: METHODS.map((m) => ({ label: m, type: 'method', detail: HELP[m] ? '' : '', apply: m })), validFor: /^\w*$/ };
  const w = ctx.matchBefore(/[A-Za-z_]\w*/);
  if (!w || (w.from === w.to && !ctx.explicit)) return null;
  const tree = syntaxTree(ctx.state).resolveInner(ctx.pos, -1);
  if (/String|Comment/.test(tree.name)) return null;
  const words = new Set(ctx.state.doc.toString().match(/[A-Za-z_]\w{1,}/g) || []);
  words.delete(ctx.state.doc.sliceString(w.from, w.to));
  const opts = [];
  for (const k of KEYWORDS) opts.push({ label: k, type: 'keyword' });
  for (const f of BUILTIN_FUNCS) opts.push({ label: f, type: 'function' });
  for (const c of BUILTIN_CLASSES) if (!/Error|Exception|StopIteration/.test(c)) opts.push({ label: c, type: 'class' });
  for (const x of words) if (!KEYWORDS.includes(x) && !BUILTIN_FUNCS.has(x) && !BUILTIN_CLASSES.has(x)) opts.push({ label: x, type: 'variable' });
  return { from: w.from, options: opts, validFor: /^\w*$/ };
}

/* -------------------------------------------------------------- theme */
const vscode = EditorView.theme({
  '&': { backgroundColor: '#1f1f1f', color: '#cccccc', height: '100%' },
  '.cm-content': { caretColor: '#aeafad', padding: '6px 0 40vh' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#aeafad', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': { backgroundColor: '#264f78 !important' },
  '.cm-selectionMatch': { backgroundColor: '#add6ff26' },
  '.cm-gutters': { backgroundColor: '#1f1f1f', color: '#6e7681', border: 'none' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#cccccc' },
  '.cm-activeLine': { backgroundColor: 'transparent', boxShadow: 'inset 0 0 0 2px #282828' },
  '&.cm-focused .cm-matchingBracket': { backgroundColor: '#0064001a', outline: '1px solid #888888' },
  '.cm-nonmatchingBracket': { color: '#ff1212cc' },
  '.cm-tooltip': { backgroundColor: '#202020', border: '1px solid #454545', color: '#cccccc', borderRadius: '6px' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': { backgroundColor: '#04395e', color: '#ffffff' },
  '.cm-panels': { backgroundColor: '#181818', color: '#cccccc' },
  '.cm-searchMatch': { backgroundColor: '#9e6a03aa' },
  '.cm-foldPlaceholder': { backgroundColor: '#333', border: 'none', color: '#ccc' },
}, { dark: true });

/* ------------------------------------------------------------- factory */
export function createEditor(parent, { onChange, keys = [], fontSize = 15, readOnly = false } = {}) {
  const ro = new Compartment(), font = new Compartment();
  const fontTheme = (px) => EditorView.theme({ '&': { fontSize: px + 'px' }, '.cm-gutters': { fontSize: px + 'px' } });
  const exts = [
      CM.lineNumbers(), runGutter, CM.highlightActiveLineGutter(), CM.highlightSpecialChars(), CM.history(), CM.foldGutter({ markerDOM: (open) => { const s = document.createElement('span'); s.className = 'v-fold' + (open ? ' open' : ''); return s; } }),
      CM.drawSelection(), CM.dropCursor(), EditorState.allowMultipleSelections.of(true), CM.indentOnInput(), CM.bracketMatching(), CM.closeBrackets(),
      CM.autocompletion({ override: [complete], icons: false }), CM.rectangularSelection(), CM.crosshairCursor(), CM.highlightActiveLine(), CM.highlightSelectionMatches(),
      CM.indentUnit.of('    '), EditorState.tabSize.of(4),
      // Tab = take the highlighted suggestion when the list is open (like VS Code), otherwise indent as usual
      keymap.of([{ key: 'Tab', run: CM.acceptCompletion }, ...keys, ...CM.closeBracketsKeymap, ...CM.defaultKeymap, ...CM.searchKeymap, ...CM.historyKeymap, ...CM.foldKeymap, ...CM.completionKeymap, CM.indentWithTab,
        { key: 'Mod-/', run: CM.toggleComment }]),
      CM.python(), semantic, indentGuides, marksField, marksDeco, inlineField, declutterAfter, hover, vscode, font.of(fontTheme(fontSize)), ro.of(EditorState.readOnly.of(readOnly)),
      EditorView.updateListener.of((u) => { if (u.docChanged && onChange) onChange(u.state.doc.toString()); }),
      EditorView.contentAttributes.of({ spellcheck: 'false', autocorrect: 'off', autocapitalize: 'off' }),
  ];
  const view = new EditorView({ state: EditorState.create({ doc: '', extensions: exts }), parent });
  let size = fontSize;
  const api = {
    view,
    get: () => view.state.doc.toString(),
    // new document: fresh undo history, same settings (font size / read-only are re-applied)
    set(code) {
      view.setState(EditorState.create({ doc: code, extensions: exts }));
      view.dispatch({ effects: [font.reconfigure(fontTheme(size)), ro.reconfigure(EditorState.readOnly.of(roOn))] });
    },
    marks(v) { view.dispatch({ effects: setMarks.of(v) }); },
    clearMarks() { view.dispatch({ effects: setMarks.of({ exec: 0, prev: 0, err: 0, errMsg: '' }) }); },
    scrollToLine(n) {
      if (n < 1 || n > view.state.doc.lines) return;
      const pos = view.state.doc.line(n).from;
      view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: 'nearest', yMargin: 60 }) });
    },
    lineRect(n) {
      if (n < 1 || n > view.state.doc.lines) return null;
      const l = view.state.doc.line(n), s = l.text.search(/\S/);
      const a = view.coordsAtPos(l.from + Math.max(0, s)), z = view.coordsAtPos(l.to);
      if (!a || !z) return null;
      return { left: a.left, right: Math.max(z.right, a.left + 20), top: a.top, bottom: a.bottom };
    },
    readOnly(on) { roOn = on; view.dispatch({ effects: ro.reconfigure(EditorState.readOnly.of(on)) }); },
    fontSize(px) { size = Math.max(10, Math.min(30, px)); view.dispatch({ effects: font.reconfigure(fontTheme(size)) }); return size; },
    get size() { return size; },
    focus() { view.focus(); },
    inline(v) { view.dispatch({ effects: setInline.of(v || {}) }); requestAnimationFrame(() => declutter(view)); },
    tokens(n) { return lineTokens(view.state, n); },
    lineText(n) { return n >= 1 && n <= view.state.doc.lines ? view.state.doc.line(n).text : ''; },
    // viewport rect of characters [from, to) of line n, kept inside the visible editor
    rangeRect(n, from, to) {
      if (n < 1 || n > view.state.doc.lines) return null;
      const l = view.state.doc.line(n);
      const a = view.coordsAtPos(Math.min(l.to, l.from + from), 1), z = view.coordsAtPos(Math.min(l.to, l.from + to), -1);
      if (!a) return null;
      const box = view.scrollDOM.getBoundingClientRect();
      const clampY = (y) => Math.max(box.top + 4, Math.min(box.bottom - 4, y));
      const top = clampY(a.top), bottom = clampY(a.bottom);
      return { left: Math.max(box.left, a.left), right: Math.min(box.right, Math.max(z ? z.right : a.left + 8, a.left + 8)), top, bottom: Math.max(bottom, top + 2) };
    },
    labelRects() { return [...view.dom.querySelectorAll('.v-lab')].map((el) => ({ el, r: el.getBoundingClientRect() })); },
    setHistory(fn, jump) { historyOf = fn; onJump = jump; },
    // replace the text but keep undo (Ctrl+Z brings the old code back)
    replaceAll(code) { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code }, selection: { anchor: 0 } }); },
  };
  let roOn = readOnly;
  return api;
}

// Read-only snippet view (quiz cards, problem previews): same colours, no gutter clutter.
export function createViewer(parent, code, fontSize = 14) {
  const state = EditorState.create({
    doc: code,
    extensions: [CM.lineNumbers(), CM.python(), semantic, indentGuides, vscode, EditorState.readOnly.of(true), EditorView.editable.of(false),
      EditorView.theme({ '&': { fontSize: fontSize + 'px' }, '.cm-content': { padding: '8px 0' } })],
  });
  return new EditorView({ state, parent });
}
