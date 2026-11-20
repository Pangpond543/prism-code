// Answer checking: run the learner's code on every test case (hidden ones too), compare the screen output and the
// files it must write with the correct answer, character by character. Spaces at line ends don't fail a test, but
// are pointed out (exam graders differ).
import { runPython } from './runner.js';
import { esc } from './core.js';
import { T } from './i18n.js';

export const outText = (res) => (res.out || []).filter((o) => o[0] !== 'err').map((o) => o[1]).join('');
const norm = (s) => String(s ?? '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, '');

const expCache = new Map();
async function expected(problem, test) {
  const key = problem.id + '|' + JSON.stringify(test) + '|' + (problem.solution || '').length;
  if (expCache.has(key)) return expCache.get(key);
  let v;
  if (test.sample !== undefined) {
    v = { out: test.sample, files: test.expectFiles || {} };
  } else {
    const res = await runPython({ code: problem.solution, stdin: test.stdin || [], files: { ...(problem.files || {}), ...(test.files || {}) }, trace: false });
    v = { out: outText(res), files: res.files || {}, ok: res.ok, error: res.error };
  }
  expCache.set(key, v);
  return v;
}

export async function checkOne(code, problem, test) {
  const req = { code, stdin: [...(test.stdin || [])], files: { ...(problem.files || {}), ...(test.files || {}) }, trace: false };
  if (test.sample !== undefined) req.sample = test.sample;
  const [res, exp] = await Promise.all([runPython(req), expected(problem, test)]);
  const got = outText(res);
  const r = { test, res, got, exp: exp.out, files: [], pass: true, warn: [] };
  if (res.needInput) { r.pass = false; r.reason = 'input'; r.prompt = res.needInput.prompt; return r; }
  if (res.error) { r.pass = false; r.reason = 'error'; }
  if (norm(got) !== norm(exp.out)) { r.pass = false; r.reason = r.reason || 'out'; }
  else if (got.replace(/\n+$/, '') !== String(exp.out).replace(/\n+$/, '')) r.warn.push(T`มีช่องว่างท้ายบรรทัดไม่ตรงกับเฉลย (ไม่นับว่าผิด แต่ระวังตอนสอบ)`);
  for (const f of problem.outFiles || []) {
    const want = (exp.files || {})[f], have = (res.files || {})[f];
    const fr = { name: f, want: want ?? '', have: have ?? null, pass: have != null && norm(have) === norm(want) };
    if (!fr.pass) { r.pass = false; r.reason = r.reason || (have == null ? 'nofile' : 'file'); }
    r.files.push(fr);
  }
  for (const f of res.unclosed || []) r.warn.push(T`ลืม close() ไฟล์ ${f} — ตอนสอบควรปิดไฟล์ทุกครั้ง`);
  return r;
}

export async function checkAll(code, problem, onEach) {
  const out = [];
  for (const t of problem.tests || []) {
    const r = await checkOne(code, problem, t);
    out.push(r);
    if (onEach) onEach(r, out.length);
  }
  return out;
}

/* ---------------------------------------------------------------- diff view */
const vis = (s) => esc(s).replace(/ /g, '<i class="sp">·</i>').replace(/\t/g, '<i class="sp">→</i>');
function lcsLines(a, b) {
  const n = a.length, m = b.length;
  if (n * m > 250000) return null;
  const d = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) d[i][j] = a[i] === b[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { ops.push(['=', a[i], b[j]]); i++; j++; }
    else if (j < m && (i >= n || d[i][j + 1] >= d[i + 1][j])) { ops.push(['+', null, b[j]]); j++; }
    else { ops.push(['-', a[i], null]); i++; }
  }
  return ops;
}
// pair a removed line with the added line right after it, so the changed characters can be marked
function pairUp(ops) {
  // inside each run of changed lines, pair removed and added lines in order (so "User 1:" sits next to "User 1 :")
  const out = [];
  for (let k = 0; k < ops.length;) {
    if (ops[k][0] === '=') { out.push(ops[k++]); continue; }
    const del = [], add = [];
    while (k < ops.length && ops[k][0] !== '=') { if (ops[k][0] === '-') del.push(ops[k][1]); else add.push(ops[k][2]); k++; }
    const n = Math.max(del.length, add.length);
    for (let m = 0; m < n; m++) {
      if (m < del.length && m < add.length) out.push(['~', del[m], add[m]]);
      else if (m < del.length) out.push(['-', del[m], null]);
      else out.push(['+', null, add[m]]);
    }
  }
  return out;
}
function charMark(a, b) {
  let p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0; while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  const mk = (x) => vis(x.slice(0, p)) + (x.length - s > p ? `<mark>${vis(x.slice(p, x.length - s))}</mark>` : (a.length !== b.length ? '<mark class="gap"></mark>' : '')) + vis(x.slice(x.length - s));
  return [mk(a), mk(b)];
}

// side-by-side: left = what your program printed, right = what the answer prints
export function diffHtml(got, want, { leftLabel = T`ของคุณ`, rightLabel = T`ที่ถูกต้อง` } = {}) {
  const a = String(got ?? '').replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
  const b = String(want ?? '').replace(/\r\n?/g, '\n').replace(/\n$/, '').split('\n');
  if (got === null) return `<div class="diff-missing">${T`โปรแกรมไม่ได้สร้างไฟล์นี้`}</div><div class="diff"><div class="dcol"><h5>${rightLabel}</h5>${b.map((l) => `<div class="dl">${vis(l) || '&nbsp;'}</div>`).join('')}</div></div>`;
  const ops = lcsLines(a, b);
  if (!ops) return `<div class="diff"><div class="dcol"><h5>${leftLabel}</h5><pre>${esc(got)}</pre></div><div class="dcol"><h5>${rightLabel}</h5><pre>${esc(want)}</pre></div></div>`;
  let L = '', R = '';
  for (const [op, x, y] of pairUp(ops)) {
    if (op === '=') { L += `<div class="dl">${vis(x) || '&nbsp;'}</div>`; R += `<div class="dl">${vis(y) || '&nbsp;'}</div>`; }
    else if (op === '~') { const [mx, my] = charMark(x, y); L += `<div class="dl bad">${mx || '&nbsp;'}</div>`; R += `<div class="dl good">${my || '&nbsp;'}</div>`; }
    else if (op === '-') { L += `<div class="dl bad">${vis(x) || '&nbsp;'}</div>`; R += `<div class="dl empty"></div>`; }
    else { L += `<div class="dl empty"></div>`; R += `<div class="dl good">${vis(y) || '&nbsp;'}</div>`; }
  }
  return `<div class="diff"><div class="dcol"><h5>${leftLabel}</h5>${L}</div><div class="dcol"><h5>${rightLabel}</h5>${R}</div></div>`;
}
