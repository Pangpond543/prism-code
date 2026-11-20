// Prism Code — the step-by-step picture of a run.
// Every variable is a glass box. When a line runs, the values it reads float out of their boxes (faint, with a glowing
// trail) and sink into the box that receives the result. Calling a function slides a new card in and the arguments
// fly into its parameters; return sends the value back and the card fades away. print() sends text to the console,
// input() brings the typed text in, and files fill up line by line.
import { esc, $ } from './core.js';
import { T } from './i18n.js';
import { icon } from './icons.js';

/* ------------------------------------------------------------- value text */
export function valText(v, max = 60) {
  if (!v) return '';
  if (v.items && v.t !== 'dict') {
    const open = v.t === 'tuple' ? '(' : v.t === 'list' ? '[' : '{', close = v.t === 'tuple' ? ')' : v.t === 'list' ? ']' : '}';
    let s = open + v.items.map((x) => valText(x, 20)).join(', ') + (v.n > v.items.length ? ', …' : '') + (v.t === 'tuple' && v.n === 1 ? ',' : '') + close;
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }
  if (v.t === 'dict') {
    const s = '{' + v.keys.map((k, i) => valText(k, 14) + ': ' + valText(v.items[i], 14)).join(', ') + (v.n > v.keys.length ? ', …' : '') + '}';
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }
  if (v.t === 'file') return `📄 ${v.name}${v.closed ? ' ✕' : ''}`;
  const r = String(v.r ?? '');
  return r.length > max ? r.slice(0, max - 1) + '…' : r;
}
const cls = (v) => 'tv-' + ({ int: 'num', float: 'num', bool: 'kw', None: 'kw', str: 'str', func: 'fn', builtin: 'fn', class: 'cls', file: 'file', range: 'cls' }[v && v.t] || 'other');
export const valHtml = (v, max) => `<span class="${cls(v)}">${esc(valText(v, max))}</span>`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const TYPE_TH = { int: 'int', float: 'float', str: 'str', bool: 'bool', list: 'list', tuple: 'tuple', dict: 'dict', set: 'set', None: 'None', file: 'file', func: 'function', range: 'range' };

function boxHtml(fid, name, v, extra = '') {
  const key = `${fid}:${name}`;
  if ((v.t === 'list' || v.t === 'tuple' || v.t === 'set') && v.items) {
    const cells = v.items.map((x, i) => `<div class="vz-cell"><span class="vz-ix">${v.t === 'set' ? '' : i}</span><span class="vz-cv">${valHtml(x, 18)}</span></div>`).join('');
    return `<div class="vz-var seq ${extra}" data-k="${esc(key)}"><div class="vz-vh"><span class="vn">${esc(name)}</span><span class="vt">${v.t} · ${v.n}</span></div><div class="vz-cells">${cells || `<span class="vz-empty">${v.t === 'list' ? '[ ]' : '( )'}</span>`}${v.n > v.items.length ? `<span class="vz-more">+${v.n - v.items.length}</span>` : ''}</div></div>`;
  }
  if (v.t === 'dict' && v.keys) {
    const cells = v.keys.map((k, i) => `<div class="vz-cell kv"><span class="vz-ix">${valHtml(k, 14)}</span><span class="vz-cv">${valHtml(v.items[i], 18)}</span></div>`).join('');
    return `<div class="vz-var seq ${extra}" data-k="${esc(key)}"><div class="vz-vh"><span class="vn">${esc(name)}</span><span class="vt">dict · ${v.n}</span></div><div class="vz-cells">${cells || '<span class="vz-empty">{ }</span>'}</div></div>`;
  }
  if (v.t === 'file') {
    return `<div class="vz-var file ${v.closed ? 'closed' : ''} ${extra}" data-k="${esc(key)}"><span class="vn">${esc(name)}</span><span class="vv">${icon('file')}<b>${esc(v.name)}</b><em>"${esc(v.mode)}"</em>${v.closed ? `<i>${T`ปิดแล้ว`}</i>` : ''}</span></div>`;
  }
  return `<div class="vz-var ${extra}" data-k="${esc(key)}"><span class="vn">${esc(name)}</span><span class="vv">${valHtml(v, 42)}</span><span class="vt">${TYPE_TH[v.t] || esc(v.t)}</span></div>`;
}

/* ---------------------------------------------------------- file replay */
function fileStates(steps, initial, upto) {
  const files = {};
  for (const [k, txt] of Object.entries(initial || {})) files[k] = { text: txt ?? '', mode: '', open: false, touched: false, lastWrite: '', lastRead: '', pos: 0, init: true };
  let last = null;
  for (let i = 0; i <= upto && i < steps.length; i++) {
    for (const e of steps[i].fx || []) {
      if (e.k !== 'file') continue;
      const f = files[e.f] || (files[e.f] = { text: '', mode: '', open: false, touched: false, lastWrite: '', lastRead: '', pos: 0 });
      f.touched = true;
      if (i === upto) last = { f: e.f, op: e.op, text: e.text };
      if (e.op === 'open') { f.mode = e.mode; f.open = true; f.pos = 0; f.lastWrite = ''; f.lastRead = ''; if (/w/.test(e.mode)) f.text = ''; }
      else if (e.op === 'write') { f.text += e.text; f.lastWrite = e.text; }
      else if (e.op === 'read') { f.pos += e.text.length; f.lastRead = e.text; }
      else if (e.op === 'close') f.open = false;
    }
  }
  return { files, last };
}

/* ---------------------------------------------------------------- flights */
let layer = null;
function fxLayer() {
  if (layer && layer.isConnected) return layer;
  layer = document.createElement('div');
  layer.id = 'fx-layer';
  layer.innerHTML = '<svg class="fx-svg"></svg>';
  document.body.appendChild(layer);
  return layer;
}
const center = (r) => ({ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 });
// a value floats out of `from` (rect), leaves a glowing trail and sinks into `to`
function fly(from, to, html, { delay = 0, dur = 900, kind = '' } = {}) {
  if (!from || !to) return Promise.resolve();
  const L = fxLayer(), svg = L.firstChild;
  const a = center(from), b = center(to);
  const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
  const lift = Math.min(120, 30 + dist * 0.22);
  const c = { x: (a.x + b.x) / 2 + (dy > 0 ? -1 : 1) * Math.min(40, Math.abs(dy) * 0.1), y: Math.min(a.y, b.y) - lift };
  const P = (t) => ({ x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y });
  // trail
  const ns = 'http://www.w3.org/2000/svg';
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', `M${a.x},${a.y} Q${c.x},${c.y} ${b.x},${b.y}`);
  path.setAttribute('class', 'fx-trail ' + kind);
  svg.appendChild(path);
  const len = path.getTotalLength();
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${len}`;
  path.animate([{ strokeDashoffset: len, opacity: 0.0 }, { strokeDashoffset: len * 0.6, opacity: 0.9, offset: 0.25 }, { strokeDashoffset: 0, opacity: 0.75, offset: 0.8 }, { strokeDashoffset: 0, opacity: 0 }],
    { duration: dur * 1.6, delay, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }).finished.then(() => path.remove(), () => path.remove());
  // the floating value
  const g = document.createElement('div');
  g.className = 'fx-ghost ' + kind;
  g.innerHTML = html;
  L.appendChild(g);
  const w = g.offsetWidth, h = g.offsetHeight;
  const frames = [];
  const N = 12;
  for (let k = 0; k <= N; k++) {
    const t = k / N, p = P(t);
    const s = k === 0 ? 0.7 : k === N ? 0.55 : 1;
    const o = k === 0 ? 0 : k === 1 ? 0.95 : k >= N - 1 ? (k === N ? 0 : 0.7) : 0.95;
    frames.push({ transform: `translate(${p.x - w / 2}px,${p.y - h / 2}px) scale(${s})`, opacity: o, filter: k === 0 ? 'blur(6px)' : k === N ? 'blur(3px)' : 'blur(0px)', offset: t });
  }
  return g.animate(frames, { duration: dur, delay, easing: 'cubic-bezier(.45,.05,.25,1)', fill: 'both' }).finished.then(() => g.remove(), () => g.remove());
}
function fadeClone(rect, html, dur) {
  if (!rect) return;
  const L = fxLayer();
  const d = document.createElement('div');
  d.className = 'fx-clone';
  d.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px`;
  d.innerHTML = html;
  L.appendChild(d);
  d.animate([{ opacity: 1, transform: 'scale(1)', filter: 'blur(0)' }, { opacity: 0, transform: 'scale(.92) translateX(30px)', filter: 'blur(6px)' }], { duration: dur, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' })
    .finished.then(() => d.remove(), () => d.remove());
}
export function clearFlights() { if (layer) { layer.querySelectorAll('.fx-ghost,.fx-clone').forEach((x) => x.remove()); layer.firstChild.innerHTML = ''; } }

/* ------------------------------------------------------------ the stage */
export class Viz {
  constructor(root, { editor, narrEl, onConsole, onStep }) {
    this.root = root; this.editor = editor; this.onConsole = onConsole; this.onStep = onStep; this.narrEl = narrEl;
    this.res = null; this.i = -1; this.timer = 0; this.playing = false; this.speed = 1; this.busy = null; this.spot = true;
    root.innerHTML = `<div class="vz-scroll"><div class="vz-frames" id="vz-frames"></div><div class="vz-files" id="vz-files"></div></div>`;
    this.framesEl = root.querySelector('#vz-frames'); this.filesEl = root.querySelector('#vz-files');
    editor.setHistory((name) => this.history(name), (i) => { this.pause(); this.show(i, false); });
    this.empty();
  }
  empty(msg) {
    this.res = null; this.i = -1; this._eol = null;
    this.narrEl.innerHTML = '';
    this.editor.inline({});
    this.framesEl.innerHTML = `<div class="vz-empty-state"><div class="orb">${icon('play')}</div><b>${msg || T`กด F6 หรือปุ่ม "ดูทีละขั้น"`}</b><span>${T`แล้วดูค่าไหลจากตัวแปรหนึ่งเข้าอีกตัวแปรในโค้ด ทีละบรรทัด — แผงนี้สรุปค่าทั้งหมดไว้ให้`}</span></div>`;
    this.filesEl.innerHTML = '';
    if (this.onStep) this.onStep(this);
  }
  get count() { return this.res ? this.res.steps.length : 0; }
  load(res, code, initialFiles) {
    this.pause();
    this.res = res; this.code = code; this.lines = code.split('\n'); this.initial = initialFiles || {};
    this.info = res.info || {};
    this.i = -1; this._eol = null; this.stale = false;
    // lines that run at least once / never run (the spotlight fades those most)
    const ran = new Set(res.steps.map((s) => s.ln));
    this.unrun = new Set();
    this.lines.forEach((t, k) => { const s = t.trim(); if (s && !s.startsWith('#') && !/^(else|try|finally|except\b.*)\s*:/.test(s) && !ran.has(k + 1)) this.unrun.add(k + 1); });
    // each return step → the call it belongs to (to fly the value back to the line that called)
    this.callOf = new Map();
    const open = [];
    res.steps.forEach((s, k) => { if (s.ev === 'call') open.push(s); else if (s.ev === 'return') { const c = open.pop(); if (c) this.callOf.set(k, c); } });
    if (!res.steps.length) { this.empty(T`ไม่มีขั้นตอนให้แสดง`); return; }
    this.show(0, false);
  }
  setSpeed(s) { this.speed = s; }
  setSpot(on) { this.spot = on; if (this.res && this.i >= 0) this.paintCode(this.i); }

  /* ----------- rendering one state */
  render(i, pendingKeys = new Set(), oldVals = new Map()) {
    const st = this.res.steps[i];
    const stack = st.stack || [];
    let html = '';
    stack.forEach((fr, k) => {
      const top = k === stack.length - 1;
      const funcs = fr.fn === 'Global' ? fr.vars.filter(([, v]) => v.t === 'func') : [];
      const vars = fr.fn === 'Global' ? fr.vars.filter(([, v]) => v.t !== 'func') : fr.vars;
      const params = fr.fn !== 'Global' ? ((this.info[this.defLine(fr.fn)] || {}).params || []) : [];
      const head = fr.fn === 'Global'
        ? `<span class="fr-name">${T`โปรแกรมหลัก`}</span><span class="fr-sub">Global</span>`
        : `<span class="fr-name"><span class="tv-fn">${esc(fr.fn)}</span>(${params.map((p) => `<span class="tv-var">${esc(p)}</span>`).join(', ')})</span><span class="fr-sub">${T`ฟังก์ชันที่ถูกเรียก`}</span>`;
      const ret = st.ev === 'return' && top ? `<div class="fr-ret" data-ret="${fr.id}">${icon('undo')}<span>return</span>${valHtml(st.val, 50)}</div>` : '';
      const boxes = vars.map(([n, v]) => {
        const key = `${fr.id}:${n}`;
        if (pendingKeys.has(key)) {
          const old = oldVals.get(key);
          return boxHtml(fr.id, n, old || v, old ? 'pending' : 'pending fresh');
        }
        return boxHtml(fr.id, n, v);
      }).join('');
      html += `<div class="vz-frame glass ${top ? 'top' : ''} ${fr.fn === 'Global' ? 'global' : 'call'}" data-fid="${fr.id}">
        <div class="fr-head">${head}<span class="fr-line">${T`บรรทัด ${fr.ln}`}</span></div>
        ${funcs.length ? `<div class="fr-funcs">${funcs.map(([n]) => `<span class="fn-chip" data-k="${fr.id}:${esc(n)}">def <b class="tv-fn">${esc(n)}</b>()</span>`).join('')}</div>` : ''}
        <div class="fr-vars">${boxes || `<span class="fr-none">${T`ยังไม่มีตัวแปร`}</span>`}</div>${ret}</div>`;
    });
    this.framesEl.innerHTML = html;
    // files
    const { files, last } = fileStates(this.res.steps, this.initial, i);
    const names = Object.keys(files).filter((n) => files[n].touched || files[n].init);
    this.filesEl.innerHTML = names.length ? `<div class="vz-files-h">${icon('folder')}<span>${T`ไฟล์ในโฟลเดอร์งาน`}</span></div>` + names.map((n) => {
      const f = files[n];
      const lines = f.text.split('\n');
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      // highlight the line just written / read
      let hl = -1;
      if (last && last.f === n && last.op === 'write') hl = lines.length - 1;
      if (last && last.f === n && last.op === 'read') hl = f.text.slice(0, f.pos).split('\n').length - (f.text.slice(0, f.pos).endsWith('\n') ? 2 : 1);
      const shown = lines.slice(Math.max(0, lines.length - 40));
      const off = lines.length - shown.length;
      return `<div class="vz-file glass ${f.open ? 'open' : ''}" data-file="${esc(n)}"><div class="vf-h">${icon('file')}<b>${esc(n)}</b>${f.open ? `<em>${T`เปิดอยู่`} "${esc(f.mode)}"</em>` : f.touched ? `<em class="muted">${T`ปิดแล้ว`}</em>` : ''}</div>
        <div class="vf-body">${shown.map((l, k) => `<div class="vf-line ${k + off === hl ? (last.op === 'read' ? 'read' : 'wrote') : ''} ${f.open && /r/.test(f.mode) && f.text.slice(0, f.pos).split('\n').length - 1 > k + off ? 'done' : ''}" data-ln="${k + off}"><i>${k + off + 1}</i>${esc(l).replace(/ /g, '&nbsp;') || '&nbsp;'}</div>`).join('') || `<div class="vf-line empty">${T`(ไฟล์ว่าง)`}</div>`}</div></div>`;
    }).join('') : '';
  }
  defLine(fn) {
    for (const [ln, d] of Object.entries(this.info)) if (d.kind === 'def' && d.name === fn) return ln;
    return 0;
  }
  /* ----------- values in scope */
  frameOf(st, fid = st.fid) { const s = st.stack || []; return s.find((f) => f.id === fid) || s[s.length - 1]; }
  valIn(st, fid, name) {
    const f = this.frameOf(st, fid), g = (st.stack || [])[0];
    const a = f && f.vars.find(([k]) => k === name);
    if (a) return a[1];
    const b = g && g.vars.find(([k]) => k === name);
    return b ? b[1] : undefined;
  }
  scopeVal(st, name) { return this.valIn(st, st.fid, name); }
  globalId(st) { const g = (st.stack || [])[0]; return g ? g.id : 1; }
  isFunc(st, n) { const v = this.scopeVal(st, n); return !!(v && (v.t === 'func' || v.t === 'class' || v.t === 'builtin')); }
  consoleUpto(i) { return (this.res.out || []).filter((o) => o[2] <= i); }
  allVars(st) { const m = new Map(); for (const fr of st.stack || []) for (const [n, v] of fr.vars) m.set(`${fr.id}:${n}`, v); return m; }

  /* ----------- what the code shows: labels above names, faint values at line ends, the strip */
  curLabels(i) {
    const st = this.res.steps[i], L = st.ln, info = this.info[L] || {}, text = this.editor.lineText(L);
    const toks = this.editor.tokens(L), labels = [];
    const add = (from, len, v, cls) => labels.push({ line: L, from, len, html: valHtml(v, 22), cls });
    if (st.ev === 'call') {
      for (const p of st.params || []) { const t = toks.find((x) => x.param && x.name === p); const v = this.scopeVal(st, p); if (t && v) add(t.from, t.to - t.from, v, 'param'); }
      return labels;
    }
    if (info.kind === 'def') return labels;
    for (const s of st.subv || []) { const off = text.indexOf(s.src); if (off >= 0) add(off, s.src.length, s.val, 'src'); }
    const assignAt = info.kind === 'assign' && !info.op ? text.search(/(?<![=!<>+\-*/%])=(?!=)/) : info.kind === 'for' ? text.indexOf(' in ') : -1;
    for (const t of toks) {
      if (t.prop || t.call || t.def || t.param) continue;
      if (labels.some((l) => t.from >= l.from && t.from < l.from + l.len)) continue;
      if (assignAt >= 0 && t.from < assignAt) continue; // the variable being assigned gets its label when the value arrives
      const v = this.scopeVal(st, t.name);
      if (!v || ['func', 'class', 'builtin', 'module'].includes(v.t)) continue;
      add(t.from, t.to - t.from, v, 'src');
    }
    return labels;
  }
  substitute(expr, st, depth = 0) {
    const KW = new Set(['and', 'or', 'not', 'in', 'is', 'True', 'False', 'None', 'if', 'else', 'for', 'lambda']);
    let out = '', i = 0;
    const n = expr.length;
    while (i < n) {
      const rest = expr.slice(i);
      const sm = /^([rRbBuUfF]{0,2})("""|'''|"|')/.exec(rest);
      if (sm && (i === 0 || !/\w/.test(expr[i - 1]))) {
        const q = sm[2], f = /f/i.test(sm[1]);
        out += sm[0]; i += sm[0].length;
        while (i < n && !expr.startsWith(q, i)) {
          if (expr[i] === '\\') { out += expr.slice(i, i + 2); i += 2; continue; }
          if (f && expr[i] === '{' && expr[i + 1] !== '{' && depth < 2) {
            let j = i + 1, d = 0;
            while (j < n && !(d === 0 && expr[j] === '}')) { if ('([{'.includes(expr[j])) d++; else if (')]}'.includes(expr[j])) d--; j++; }
            const inner = expr.slice(i + 1, j);
            const cut = inner.search(/[:!](?![=])/);
            const e = cut >= 0 ? inner.slice(0, cut) : inner;
            out += '{' + this.substitute(e, st, depth + 1) + (cut >= 0 ? inner.slice(cut) : '') + '}';
            i = j + 1;
            continue;
          }
          out += expr[i++];
        }
        if (i < n) { out += q; i += q.length; }
        continue;
      }
      const im = /^[A-Za-z_]\w*/.exec(rest);
      if (im && (i === 0 || !/[\w.]/.test(expr[i - 1]))) {
        const name = im[0], j = i + name.length;
        if (expr[j] === '[') {
          let k = j, d = 0;
          for (; k < n; k++) { if (expr[k] === '[') d++; else if (expr[k] === ']' && --d === 0) break; }
          const sv = (st.subv || []).find((x) => x.src === expr.slice(i, k + 1));
          if (sv) { out += valText(sv.val, 24); i = k + 1; continue; }
        }
        const v = this.scopeVal(st, name);
        if (v && !KW.has(name) && expr.slice(j).trimStart()[0] !== '(' && !['func', 'class', 'builtin', 'module'].includes(v.t)) { out += valText(v, 24); i = j; continue; }
        out += name; i = j;
        continue;
      }
      out += expr[i++];
    }
    return out;
  }
  // the orange strip after the current line: expression → with the values put in → result
  strip(i, result) {
    const st = this.res.steps[i], info = this.info[st.ln] || {};
    const cut = (s) => (s.length > 70 ? s.slice(0, 68) + '…' : s);
    if (st.ev === 'return') return `<span class="s-k">return</span> <i>→</i> <b class="s-res">${valHtml(st.val, 40)}</b> <span class="s-k">${T`ส่งกลับไปที่บรรทัดที่เรียก`}</span>`;
    if (st.ev === 'exc') return `<span class="s-bad">✖ ${esc(st.etype)}</span>`;
    if (st.ev === 'call' || st.ev === 'end') return '';
    const expr = { assign: info.expr, if: info.test, while: info.test, return: info.expr, expr: info.expr, for: info.iter }[info.kind];
    if (!expr) return '';
    const sub = this.substitute(expr, st);
    const literal = /^\s*(-?[\d.]+|"[^"]*"|'[^']*'|\[\]|\{\}|\(\)|True|False|None)\s*$/.test(expr);
    if (sub === expr && (result == null || literal)) return '';
    // only the version with the values filled in (the code itself is right there on the line)
    let h = `<span class="s-s">${esc(cut(sub))}</span>`;
    if (result != null) h += ` <i>→</i> <b class="s-res">${result}</b>`;
    return h;
  }
  // result of running line prev (shown at the end of the strip once it has run)
  resultOf(prev, st, changed, newAll) {
    const info = this.info[prev.ln] || {};
    const inBody = st.ln >= (info.body || [0])[0] && st.ln <= (info.body || [0, 0])[1] && st.fid === prev.fid;
    if (info.kind === 'if' || info.kind === 'while') { const c = prev.cond !== undefined ? prev.cond : inBody; return c ? '<span class="tv-kw">True</span>' : '<span class="tv-kw">False</span>'; }
    if (info.kind === 'for') return inBody ? changed.map((k) => `${esc(k.split(':').slice(1).join(':'))} = ${valHtml(newAll.get(k), 20)}`).join(', ') : T`ครบแล้ว ออกจากลูป`;
    const out = (st.fx || []).filter((e) => e.k === 'out').map((e) => e.text).join('');
    if (out.trim()) return `<span class="tv-out">${esc(JSON.stringify(out.replace(/\n$/, '')).slice(0, 60))}</span>`;
    if (changed.length) return changed.length === 1 ? valHtml(newAll.get(changed[0]), 30) : changed.map((k) => valHtml(newAll.get(k), 16)).join(', ');
    return null;
  }
  // faint "name = value" after every line that has run (latest value), like VS Code's inline values while debugging
  eolUpTo(i, cur) {
    if (!this._eol || this._eol.i > i) this._eol = { i: 0, m: new Map() };
    const m = this._eol.m;
    for (let k = this._eol.i; k < i; k++) {
      const a = this.res.steps[k], b = this.res.steps[k + 1];
      if (a.ev !== 'line') continue;
      const info = this.info[a.ln] || {};
      let txt = null;
      if (info.kind === 'assign' || info.kind === 'for') {
        const parts = (info.stores || []).map((nm) => { const v = this.valIn(b, a.fid, nm); return v ? `${nm} = ${valText(v, 28)}` : null; }).filter(Boolean);
        if (parts.length) txt = parts.join(', ');
      } else if (info.kind === 'if' || info.kind === 'while') {
        const inBody = b.ln >= (info.body || [0])[0] && b.ln <= (info.body || [0, 0])[1];
        txt = '→ ' + ((a.cond !== undefined ? a.cond : inBody) ? 'True' : 'False');
      } else if (info.kind === 'expr') {
        const before = this.frameOf(a), after = this.frameOf(b, a.fid);
        if (before && after) {
          const ch = after.vars.filter(([n, v]) => { const o = before.vars.find(([x]) => x === n); return v.t !== 'func' && (!o || !same(o[1], v)); });
          if (ch.length) txt = ch.map(([n, v]) => `${n} = ${valText(v, 28)}`).join(', ');
        }
      }
      if (txt) m.set(a.ln, txt);
    }
    this._eol.i = Math.max(this._eol.i, i);
    return [...m].filter(([L]) => L !== cur).map(([L, t]) => ({ line: L, html: esc(t) }));
  }
  paintCode(i, { strip, labels = [], keep = [], cur } = {}) {
    if (this.stale) return;
    const st = this.res.steps[i];
    const line = cur !== undefined ? cur : st.ev === 'end' ? 0 : st.ln;
    const v = { cur: line, labels: [], eol: this.eolUpTo(i, line), dim: this.spot && !!line && i < this.count - 1, unrun: this.unrun, keep };
    if (line) {
      if (line === st.ln) v.labels = this.curLabels(i);
      const s = strip !== undefined ? strip : this.strip(i, null);
      if (s) v.eol.push({ line, html: s, cls: 'strip' });
    }
    v.labels.push(...labels);
    this.editor.inline(v);
  }
  // every value a name had (for the hover history in the editor)
  history(name) {
    if (!this.res) return null;
    const out = [];
    let last = null;
    this.res.steps.forEach((st, i) => {
      const v = this.scopeVal(st, name);
      if (!v || v.t === 'func') return;
      const key = JSON.stringify(v);
      if (key !== last) { out.push({ i, ln: st.ln, html: valHtml(v, 18) }); last = key; }
    });
    return out.slice(-40);
  }

  /* ----------- values flying between names in the code */
  tokRect(n, name, pick = 'first') {
    const ts = this.editor.tokens(n).filter((t) => t.name === name && !t.prop && !t.call && !t.def);
    const t = pick === 'last' ? ts[ts.length - 1] : ts[0];
    return t ? this.editor.rangeRect(n, t.from, t.to) : null;
  }
  textRect(n, text) { const off = this.editor.lineText(n).indexOf(text); return off >= 0 ? this.editor.rangeRect(n, off, off + text.length) : null; }
  consoleRect() { const c = $('console-out'); if (!c) return null; const r = c.getBoundingClientRect(); return { left: r.left + 20, right: r.left + 180, top: r.bottom - 34, bottom: r.bottom - 10 }; }
  codeFlights(prevI, prev, st, changed, newAll, D) {
    const jobs = [], L = prev.ln, text = this.editor.lineText(L);
    const fl = (a, b, html, kind, delay = 0, dur = D) => { if (a && b) jobs.push(fly(a, b, html, { delay, dur, kind })); };
    const nameOf = (k) => k.split(':').slice(1).join(':');
    // 1) a call: each argument at the call site flies up to its parameter in "def"
    if (st.ev === 'call') {
      const defLn = +this.defLine(st.callee);
      (st.params || []).forEach((p, k) => {
        const a = (st.args || [])[k];
        const from = (a && this.textRect(L, a.src)) || this.tokRect(L, st.callee);
        const pt = this.editor.tokens(defLn).find((t) => t.param && t.name === p);
        fl(from, pt && this.editor.rangeRect(defLn, pt.from, pt.to), valHtml(newAll.get(`${st.fid}:${p}`), 24), 'arg', k * 260, D * 1.15);
      });
      return jobs;
    }
    // 2) back from a return: the value flies from "return …" down to the line that called
    if (prev.ev === 'return') {
      const call = this.callOf.get(prevI), callLn = call ? call.fromLn : st.ln;
      const off = text.indexOf('return');
      const from = off >= 0 ? this.editor.rangeRect(L, off + 6, text.length) : this.editor.rangeRect(L, 0, text.length);
      const tg = changed.filter((k) => this.editor.tokens(callLn).some((t) => t.name === nameOf(k)));
      if (tg.length) tg.forEach((k, n) => fl(from, this.tokRect(callLn, nameOf(k)), valHtml(newAll.get(k), 24), 'ret', n * 220, D * 1.15));
      else fl(from, this.tokRect(callLn, prev.callee) || this.textRect(callLn, prev.callee), valHtml(prev.val, 24), 'ret', 0, D * 1.15);
      return jobs;
    }
    // 3) an ordinary line: the labels above the names it reads float into the name that receives the result
    const srcs = this.editor.labelRects().filter((x) => x.el.classList.contains('src') && x.r.width > 0);
    srcs.forEach((x) => x.el.classList.add('go'));
    const fx = st.fx || [];
    const targets = changed.filter((k) => this.editor.tokens(L).some((t) => t.name === nameOf(k) && !t.prop));
    const used = new Set();
    let delay = 0;
    const consoleR = this.consoleRect();
    for (const e of fx) {
      if (e.k === 'in') {
        const k = targets.find((x) => !used.has(x));
        fl(consoleR, k ? this.tokRect(L, nameOf(k)) : this.editor.rangeRect(L, 0, text.length), `<span class="tv-str">'${esc(e.text.replace(/\n$/, ''))}'</span>`, 'in', delay, D * 1.1);
        if (k) used.add(k);
        delay += 150;
      } else if (e.k === 'out' && e.text.trim()) {
        const pr = this.tokRect(L, 'print') || this.textRect(L, 'print') || this.editor.rangeRect(L, 0, 6);
        srcs.forEach((x, m) => fl(x.r, pr, x.el.innerHTML, 'var', m * 120, D * 0.6));
        fl(pr, consoleR, `<span class="tv-out">${esc(e.text.replace(/\n$/, '').slice(0, 40))}</span>`, 'out', delay + (srcs.length ? D * 0.45 : 0), D * 0.8);
        delay += 150;
      } else if (e.k === 'file' && e.op === 'write') {
        const ft = this.editor.tokens(L).find((t) => !t.prop && text.slice(t.to).startsWith('.write'));
        const to = ft ? this.editor.rangeRect(L, ft.from, ft.to) : this.textRect(L, 'write');
        srcs.forEach((x, m) => fl(x.r, to, x.el.innerHTML, 'file', m * 120, D * 0.9));
        if (!srcs.length) fl(this.textRect(L, '(') || this.editor.rangeRect(L, 0, text.length), to, `<span class="tv-str">${esc(JSON.stringify(e.text).slice(0, 40))}</span>`, 'file', delay, D * 0.9);
        delay += 150;
      } else if (e.k === 'file' && e.op === 'read') {
        const ft = this.editor.tokens(L).find((t) => { const v = this.scopeVal(prev, t.name); return !t.prop && v && v.t === 'file'; });
        const k = targets.find((x) => !used.has(x));
        fl(ft ? this.editor.rangeRect(L, ft.from, ft.to) : null, k ? this.tokRect(L, nameOf(k)) : null, `<span class="tv-str">${esc(JSON.stringify(e.text).slice(0, 40))}</span>`, 'file', delay, D);
        if (k) used.add(k);
        delay += 150;
      }
    }
    const stripEl = this.editor.view.dom.querySelector('.v-eol.strip');
    const stripR = stripEl ? stripEl.getBoundingClientRect() : null;
    targets.filter((k) => !used.has(k)).forEach((k, n) => {
      const to = this.tokRect(L, nameOf(k));
      if (srcs.length) srcs.forEach((x, m) => fl(x.r, to, x.el.innerHTML, 'var', n * 150 + m * 140));
      else fl(stripR || this.editor.rangeRect(L, text.length - 1, text.length), to, valHtml(newAll.get(k), 24), 'lit', n * 150);
    });
    return jobs;
  }
  // labels for the values that just arrived (pink, above the receiving names)
  dstLabels(prevI, prev, st, changed, newAll) {
    const nameOf = (k) => k.split(':').slice(1).join(':');
    const L = prev.ev === 'return' ? ((this.callOf.get(prevI) || {}).fromLn || st.ln) : prev.ln;
    const toks = this.editor.tokens(L), out = [];
    for (const k of changed) {
      const t = toks.find((x) => x.name === nameOf(k) && !x.prop && !x.call);
      if (t) out.push({ line: L, from: t.from, len: t.to - t.from, html: valHtml(newAll.get(k), 22), cls: 'dst' });
    }
    return { line: L, labels: out };
  }

  /* ----------- showing a step (with the transition from the previous one) */
  async show(i, animate = true) {
    if (!this.res || this.stale) return 0;
    i = Math.max(0, Math.min(this.count - 1, i));
    const prevI = this.i;
    const forward = animate && i === prevI + 1 && prevI >= 0;
    this.i = i;
    clearFlights();
    const st = this.res.steps[i];
    const prev = prevI >= 0 ? this.res.steps[prevI] : null;
    const token = (this.busy = {});
    // the error line lights up only once the run reaches it (no spoilers while stepping)
    const errAt = (k) => {
      const exc = this.res.steps.slice(0, k + 1).reverse().find((s) => s.ev === 'exc');
      return this.res.error && exc ? { err: this.res.error.line || exc.ln, errMsg: `${this.res.error.type}: ${this.res.error.msg}` } : { err: 0, errMsg: '' };
    };
    const settle = (prevLine) => {
      this.editor.marks({ exec: st.ev === 'end' ? 0 : st.ln, prev: prevLine || 0, ...errAt(i) });
      if (st.ev !== 'end') this.editor.scrollToLine(st.ln);
      this.paintCode(i);
    };
    if (!forward) {
      settle(0);
      if (this.onConsole) this.onConsole(this.consoleUpto(i), i === this.count - 1);
      this.render(i);
      this.narrEl.innerHTML = this.describeAt(i);
      if (this.onStep) this.onStep(this);
      return 0;
    }
    const oldAll = this.allVars(prev), newAll = this.allVars(st);
    const changed = [...newAll.keys()].filter((k) => !same(oldAll.get(k), newAll.get(k)) && newAll.get(k).t !== 'func');
    // the summary panel already shows the new layout; changed boxes keep the old value until it "arrives"
    this.render(i, new Set(changed), oldAll);
    if (st.ev === 'call') { const card = this.root.querySelector(`[data-fid="${st.fid}"]`); if (card) card.classList.add('enter'); }
    this.narrEl.innerHTML = this.describe(prev, st);
    if (this.onStep) this.onStep(this);
    const D = 1450 / this.speed;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    // phase 1: still on the line that runs — its labels glow and float into the receiving names, the strip fills in
    const callLn = prev.ev === 'return' ? ((this.callOf.get(prevI) || {}).fromLn || st.ln) : 0;
    if (callLn) this.editor.scrollToLine(callLn);
    this.editor.marks({ exec: prev.ln, prev: 0, ...errAt(prevI) });
    const result = st.ev === 'return' ? valHtml(st.val, 30) : st.ev === 'call' || prev.ev === 'return' ? null : this.resultOf(prev, st, changed, newAll);
    const stripNow = prev.ev === 'return' ? this.strip(prevI, null) : this.strip(prevI, null);
    this.paintCode(prevI, { strip: stripNow, keep: callLn ? [callLn] : st.ev === 'call' ? [st.ln] : [] });
    await wait(40);
    if (this.busy !== token) return 0;
    const jobs = this.codeFlights(prevI, prev, st, changed, newAll, D);
    await wait(jobs.length ? D * 0.72 : D * 0.35);
    if (this.busy !== token) return 0;
    // phase 2: the values arrive — pink labels above the names that received them, the result in the strip
    const dst = this.dstLabels(prevI, prev, st, changed, newAll);
    const stripDone = result != null ? this.strip(prevI, result) : stripNow;
    if (st.ev === 'call') {
      const defLn = +this.defLine(st.callee);
      const lab = this.curLabels(i);
      this.paintCode(prevI, { strip: stripDone, labels: lab, keep: [defLn] });
    } else this.paintCode(prevI, { strip: stripDone, labels: dst.line === prev.ln ? dst.labels : dst.labels, keep: callLn ? [callLn] : [] });
    if (this.onConsole) this.onConsole(this.consoleUpto(i), i === this.count - 1);
    for (const k of changed) {
      const el = this.root.querySelector(`[data-k="${CSS.escape(k)}"]`);
      if (!el) continue;
      const [fid, ...rest] = k.split(':');
      const tmp = document.createElement('div');
      tmp.innerHTML = boxHtml(+fid, rest.join(':'), newAll.get(k));
      const nu = tmp.firstElementChild;
      nu.classList.add('pop');
      el.replaceWith(nu);
    }
    await wait((changed.length || result != null ? 650 : 250) / this.speed);
    if (this.busy !== token) return 0;
    // phase 3: move on to the next line
    settle(prev.ln);
    return D;
  }

  /* ----------- narration */
  code1(s) { return `<code class="nc">${esc(s)}</code>`; }
  describeAt(i) {
    const st = this.res.steps[i];
    if (i === 0) return `<span class="n-ln">${T`เริ่ม`}</span> ${T`โปรแกรมเริ่มทำงานจากบรรทัดบนสุด ลงมาทีละบรรทัด`}`;
    if (st.ev === 'end') return `<span class="n-ln ok">${T`จบ`}</span> ${T`โปรแกรมทำงานจบแล้ว`}`;
    return `<span class="n-ln">${T`บรรทัด ${st.ln}`}</span> ${T`กำลังจะทำบรรทัดนี้`}: ${this.code1((this.lines[st.ln - 1] || '').trim())}`;
  }
  describe(prev, st) {
    const L = prev.ln, info = this.info[L] || {}, src = (this.lines[L - 1] || '').trim();
    const oldAll = this.allVars(prev), newAll = this.allVars(st);
    const changed = [...newAll.keys()].filter((k) => !same(oldAll.get(k), newAll.get(k)) && newAll.get(k).t !== 'func');
    const nm = (k) => `<b class="tv-var">${esc(k.split(':').slice(1).join(':'))}</b>`;
    const lnTag = `<span class="n-ln">${T`บรรทัด ${L}`}</span>`;
    if (st.ev === 'call') {
      const parts = (st.params || []).map((p) => `${valHtml(newAll.get(`${st.fid}:${p}`), 24)} → <b class="tv-var">${esc(p)}</b>`).join(', ');
      return `<span class="n-ln call">${T`เรียกฟังก์ชัน`}</span> <b class="tv-fn">${esc(st.callee)}</b>() — ${parts ? T`ส่งค่าเข้าไป: ${parts}` : T`ไม่มีค่าที่ส่งเข้าไป`} · ${T`กระโดดไปทำโค้ดในฟังก์ชัน`}`;
    }
    if (st.ev === 'return') return `<span class="n-ln ret">return</span> ${T`ฟังก์ชัน ${`<b class="tv-fn">${esc(st.callee)}</b>`} ส่งค่า ${valHtml(st.val, 40)} กลับไปให้บรรทัดที่เรียก`}`;
    if (st.ev === 'exc') return `<span class="n-ln bad">${T`ผิดพลาด`}</span> ${lnTag} <b>${esc(st.etype)}</b>: ${esc(st.emsg)}`;
    if (prev.ev === 'exc') return `<span class="n-ln bad">${T`ผิดพลาด`}</span> ${st.ev === 'end' ? T`โปรแกรมหยุดทำงานเพราะเกิด ${`<b>${esc(prev.etype)}</b>`} — ดูคำอธิบายในหน้าจอด้านล่าง` : T`ข้อผิดพลาดหลุดออกจากฟังก์ชันกลับมาที่บรรทัดที่เรียก`}`;
    if (prev.ev === 'call') return `<span class="n-ln call">${T`เข้าฟังก์ชันแล้ว`}</span> ${T`อยู่ในฟังก์ชัน ${`<b class="tv-fn">${esc(prev.callee)}</b>`} แล้ว — เริ่มทำบรรทัดแรกข้างใน (พารามิเตอร์มีค่าที่ส่งมาแล้ว)`}`;
    if (prev.ev === 'return') {
      return `<span class="n-ln ret">${T`กลับมาแล้ว`}</span> ${changed.length ? T`ค่าที่ได้จากฟังก์ชันถูกเก็บลง ${changed.map(nm).join(', ')}` : T`กลับมาทำต่อในบรรทัดที่เรียกฟังก์ชัน`}`;
    }
    const fx = st.fx || [];
    const out = fx.filter((e) => e.k === 'out').map((e) => e.text).join('');
    const inp = fx.filter((e) => e.k === 'in').map((e) => e.text.replace(/\n$/, ''));
    const fio = fx.filter((e) => e.k === 'file');
    const tail = [];
    if (inp.length) tail.push(T`รับค่าที่พิมพ์ ${inp.map((x) => `<span class="tv-str">'${esc(x)}'</span>`).join(', ')} (input() ได้เป็นข้อความ str เสมอ)`);
    for (const e of fio) {
      if (e.op === 'open') tail.push(/w/.test(e.mode) ? T`เปิดไฟล์ ${`<b>${esc(e.f)}</b>`} โหมด "w" — ล้างของเดิมแล้วเริ่มเขียนใหม่` : /a/.test(e.mode) ? T`เปิดไฟล์ ${`<b>${esc(e.f)}</b>`} โหมด "a" — เขียนต่อท้ายของเดิม` : T`เปิดไฟล์ ${`<b>${esc(e.f)}</b>`} เพื่ออ่าน`);
      if (e.op === 'write') tail.push(T`เขียน ${`<span class="tv-str">${esc(JSON.stringify(e.text))}</span>`} ลงไฟล์`);
      if (e.op === 'read') tail.push(T`อ่าน ${`<span class="tv-str">${esc(JSON.stringify(e.text))}</span>`} จากไฟล์`);
      if (e.op === 'close') tail.push(T`ปิดไฟล์ ${`<b>${esc(e.f)}</b>`}`);
    }
    if (out) tail.push(T`แสดง ${`<span class="tv-out">${esc(out.replace(/\n$/, '').slice(0, 80))}</span>`} ออกหน้าจอ`);
    let main = '';
    switch (info.kind) {
      case 'assign': {
        const tg = changed.length ? changed.map((k) => `${nm(k)} = ${valHtml(newAll.get(k), 30)}`).join(', ') : '';
        if (info.op) main = T`อัปเดตค่า ${this.code1(src)} → ${tg}`;
        else if (/^[\w.]+$|^-?[\d.]+$|^".*"$|^'.*'$/.test(info.expr || '') && !inp.length) main = T`เก็บค่าลงตัวแปร: ${tg || this.code1(src)}`;
        else main = T`คำนวณ ${this.code1(info.expr || src)} ได้ผลแล้วเก็บลง ${tg || this.code1((info.targets || []).join(', '))}`;
        break;
      }
      case 'if': {
        const c = prev.cond !== undefined ? prev.cond : (st.ln >= (info.body || [0])[0] && st.ln <= (info.body || [0, 0])[1]);
        main = T`${info.elif ? 'elif' : 'if'} ตรวจเงื่อนไข ${this.code1(info.test)} → ${c ? '<b class="ok">True</b>' : '<b class="bad">False</b>'}` + ' ' + (c ? T`เข้าไปทำในบล็อกนี้` : info.orelse ? T`ข้ามไปดูทางถัดไป` : T`ข้ามบล็อกนี้ไป`);
        break;
      }
      case 'while': {
        const c = prev.cond !== undefined ? prev.cond : (st.ln >= (info.body || [0])[0] && st.ln <= (info.body || [0, 0])[1]);
        main = T`while ตรวจ ${this.code1(info.test)} → ${c ? '<b class="ok">True</b>' : '<b class="bad">False</b>'}` + ' ' + (c ? T`วนทำในลูปอีกรอบ` : T`ออกจากลูป`);
        break;
      }
      case 'for': {
        const inBody = st.ln >= (info.body || [0])[0] && st.ln <= (info.body || [0, 0])[1] && st.fid === prev.fid;
        const tg = changed.filter((k) => !fio.length || true).map((k) => `${nm(k)} = ${valHtml(newAll.get(k), 30)}`).join(', ');
        main = inBody ? T`for รอบใหม่: หยิบค่าถัดไปจาก ${this.code1(info.iter)} → ${tg || this.code1(info.target)}` : T`for หยิบค่าจาก ${this.code1(info.iter)} ครบแล้ว — ออกจากลูป`;
        break;
      }
      case 'def': main = T`สร้างฟังก์ชัน ${`<b class="tv-fn">${esc(info.name)}</b>`}() เก็บไว้ — โค้ดข้างในยังไม่ทำงานจนกว่าจะถูกเรียก`; break;
      case 'return': main = T`return`; break;
      case 'import': main = T`นำเข้าโมดูล ${this.code1(src)}`; break;
      case 'expr': main = changed.length ? T`ทำคำสั่ง ${this.code1(src)} → ${changed.map((k) => `${nm(k)} = ${valHtml(newAll.get(k), 40)}`).join(', ')}` : (out || fio.length ? '' : T`ทำคำสั่ง ${this.code1(src)}`); break;
      default: main = this.code1(src);
    }
    if (st.ev === 'end') tail.push(`<b class="ok">${T`โปรแกรมจบแล้ว`}</b>`);
    return `${lnTag} ${[main, ...tail].filter(Boolean).join(' · ')}`;
  }

  /* ----------- playback */
  async next() { if (this.res && this.i < this.count - 1) return this.show(this.i + 1, true); return -1; }
  prev() { if (this.res && this.i > 0) this.show(this.i - 1, false); }
  first() { if (this.res) this.show(0, false); }
  last() { if (this.res) this.show(this.count - 1, false); }
  async play() {
    if (!this.res) return;
    if (this.i >= this.count - 1) this.show(0, false);
    this.playing = true;
    if (this.onStep) this.onStep(this);
    const loop = async () => {
      if (!this.playing) return;
      const d = await this.next();
      if (d === -1 || this.i >= this.count - 1) { this.pause(); return; }
      this.timer = setTimeout(loop, Math.max(160, (d ? 520 : 480) / this.speed));
    };
    this.timer = setTimeout(loop, 250 / this.speed);
  }
  pause() { this.playing = false; clearTimeout(this.timer); if (this.onStep) this.onStep(this); }
  toggle() { if (this.playing) this.pause(); else this.play(); }
}
