// Prism Code — learn Python by watching it run. Main window: Prism suite shell, the VS Code-style editor + console,
// the step-by-step stage, files, answer checking, the problem library (BU Final, generated, imported .ipynb) and
// the "predict before you run" quiz. Python itself runs offline in a worker (runner.js → py-worker.js → tracer.py).
import { api, native, T, lang, theme, setTheme, savedTheme, setLook, savedLook, remember, recall, toast, htmlBox, confirmBox, promptBox, hideCtx, esc, $, bus } from './core.js';
import { icon, hydrateIcons } from './icons.js';
import { translateDom, tr } from './i18n.js';
import { startBackground } from './bg.js';
import { createEditor, createViewer } from './editor.js';
import { runPython, stopPython, pyInfo, isBusy } from './runner.js';
import { Viz, clearFlights } from './viz.js';
import { explain } from './errors.js';
import { renderMd } from './md.js';
import { BU_FINAL, TOPIC_NAMES } from './packs.js';
import { checkAll, checkOne, diffHtml, outText } from './checker.js';
import { TEMPLATES, generate, finalize } from './gen.js';
import { makeQuiz, QUIZ_TOPICS } from './quiz.js';
import { packFromNotebook, looksLikeNotebook } from './notebook.js';
import { initLibrary, mountLibrary, refreshLibrary, libCount, flashRow, inLib, setPageRail, libKey } from './lib.js';
import { createRail } from './rail.js';

addEventListener('error', (e) => api.invoke('app:log', 'JS error: ' + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
addEventListener('unhandledrejection', (e) => api.invoke('app:log', 'JS rejection: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));

/* ------------------------------------------------------------ about/update */
const AUTHOR = 'Thanakorn Damrikitjaroen', MODEL = 'Claude Opus 5.5';
const PURPOSE = 'Prism Code helps you learn Python by watching it run — values float from variable to variable, function calls slide in and out, files fill line by line — with exam-style problems, answer checking and a predict-the-output quiz. Python runs on your PC, nothing goes online.';
async function showInfo() {
  const info = await api.invoke('about:info');
  const link = info.repo ? `https://github.com/${info.repo}` : '';
  htmlBox(`
    <div class="about">
      <div class="prism-logo big"><i></i><i></i><i></i><b class="lg"><svg viewBox="18 18 64 64" aria-hidden="true"><path d="M36 34 L22 50 L36 66 M64 34 L78 50 L64 66" fill="none" stroke="#fff" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M56 28 L44 72" stroke="#fff" stroke-width="7" stroke-linecap="round"/></svg></b></div>
      <h3>Prism Code <small>v${esc(info.version)}</small></h3>
      <p class="about-purpose">${esc(PURPOSE)}</p>
      <dl class="kv">
        <dt>${T`เวอร์ชัน`}</dt><dd>${esc(info.version)} · Tauri ${esc(info.tauri || '')} · Python ${esc(pyInfo.version || '…')} (Pyodide) · CodeMirror</dd>
        <dt>${T`ผู้พัฒนา`}</dt><dd>${AUTHOR}</dd>
        <dt>${T`โมเดล AI ที่สร้าง`}</dt><dd>${MODEL}</dd>
        <dt>GitHub</dt><dd>${link ? `<a href="#" id="about-repo">${esc(link)}</a>` : T`<span class="muted">ยังไม่ได้ตั้งค่าลิงก์</span>`}</dd>
      </dl>
      <div class="about-update" id="about-update"><span class="muted">${link ? T`กดเพื่อตรวจว่ามีเวอร์ชันใหม่บน GitHub หรือไม่` : T`ใส่ชื่อ repository ในไฟล์ prism.config.json (เช่น "owner/prism") เพื่อเปิดใช้การอัปเดต`}</span></div>
      <div class="modal-btns"><button class="pill-btn" data-x>${T`ปิด`}</button><button class="pill-btn primary" id="about-check">${icon('refresh')}<span>${T`ตรวจหาอัปเดต`}</span></button></div>
    </div>`, (m, close) => {
    const box = m.querySelector('#about-update'), btn = m.querySelector('#about-check');
    const say = (html) => { box.innerHTML = html; };
    const why = (r) => ({
      norepo: T`ยังไม่ได้ตั้งค่าลิงก์ GitHub — ใส่ชื่อ repository ในไฟล์ prism.config.json`,
      notfound: T`ไม่พบ repository นี้บน GitHub`, noversion: T`repository นี้ยังไม่มีเลขเวอร์ชัน`,
      network: T`เชื่อมต่อ GitHub ไม่ได้ — ตรวจอินเทอร์เน็ตแล้วลองใหม่`, uptodate: T`เป็นเวอร์ชันล่าสุดอยู่แล้ว`,
      extract: T`แตกไฟล์อัปเดตไม่สำเร็จ`, layout: T`ไฟล์อัปเดตมีโครงสร้างไม่ถูกต้อง`, notprism: T`ไฟล์ที่ดาวน์โหลดมาไม่ใช่โปรแกรม Prism`,
      build: T`คอมไพล์เวอร์ชันใหม่ไม่สำเร็จ — ต้องติดตั้ง Rust (cargo) ในเครื่องนี้`,
      noasset: T`เวอร์ชันใหม่ยังไม่มีไฟล์สำหรับอัปเดตอัตโนมัติ — กดลิงก์ GitHub ด้านบนเพื่อดาวน์โหลดเอง`,
    }[r.reason] || T`เกิดข้อผิดพลาดระหว่างอัปเดต`);
    m.querySelector('[data-x]').onclick = () => close(null);
    if (link) m.querySelector('#about-repo').onclick = (e) => { e.preventDefault(); api.invoke('about:openRepo'); };
    const off = api.on('update:step', ({ step }) => {
      const label = { download: T`กำลังดาวน์โหลด`, extract: T`กำลังแตกไฟล์`, copy: T`กำลังติดตั้ง`, build: T`กำลังคอมไพล์โปรแกรม (Rust)` }[step] || step;
      say(`<span>${label}…</span><div class="progress indet"><i></i></div>`);
    });
    const apply = async () => {
      btn.disabled = true;
      saveNow();
      say(T`<span>กำลังดาวน์โหลด…</span><div class="progress indet"><i></i></div>`);
      const r = await api.invoke('update:apply');
      if (!r.ok) { say(`<span class="bad">${esc(why(r))}</span>`); btn.disabled = false; return; }
      say(`<span class="good">${T`ติดตั้งเวอร์ชัน ${esc(r.version)} แล้ว — เริ่มโปรแกรมใหม่เพื่อใช้งาน`}</span>`);
      btn.innerHTML = T`<span>เริ่มโปรแกรมใหม่</span>`; btn.disabled = false;
      btn.onclick = () => { off(); api.invoke('app:relaunch'); };
    };
    btn.onclick = async () => {
      btn.disabled = true;
      say(T`<span>กำลังตรวจสอบ…</span><div class="progress indet"><i></i></div>`);
      const r = await api.invoke('update:check');
      btn.disabled = false;
      if (!r.ok) { say(`<span class="bad">${esc(why(r))}</span>`); return; }
      if (!r.hasUpdate) { say(`<span class="good">${T`เป็นเวอร์ชันล่าสุดอยู่แล้ว (v${esc(r.current)})`}</span>`); return; }
      say(`<span class="good">${T`มีเวอร์ชันใหม่ v${esc(r.latest)} (ตอนนี้ใช้ v${esc(r.current)})`}</span>`);
      btn.innerHTML = `${icon('download')}<span>${T`อัปเดตเลย`}</span>`;
      btn.onclick = apply;
    };
  });
}

/* ------------------------------------------------------------------ state */
const KEY = 'prism.code.v1';
const S = (() => {
  const d = { docs: [], open: [], active: null, packs: [], gen: [], folders: [], hiddenPacks: [], progress: {}, quiz: { right: 0, total: 0, streak: 0, best: 0, topic: 'all' }, hintsShown: {},
    ui: { fontSize: 15, probW: 285, vizW: 0.34, conH: 200, noprob: false, focus: false, noright: false, spot: true, predict: false, speed: 1, rtab: 'viz', libTab: 'prob' } };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) return { ...d, ...s, ui: { ...d.ui, ...(s.ui || {}) }, quiz: { ...d.quiz, ...(s.quiz || {}) } }; } catch { /* */ }
  return d;
})();
let saveT = 0;
const save = () => { clearTimeout(saveT); saveT = setTimeout(saveNow, 400); };
// The page's storage holds ~5 M characters. A data file a program wrote (or one loaded beside a .py) can be huge:
// such files stay for this session but are not saved, so the code itself always fits.
const BIG_FILE = 300000;
const keepSmall = (k, v) => ((k === 'files' || k === 'origFiles') && v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.entries(v).filter(([, t]) => typeof t !== 'string' || t.length <= BIG_FILE)) : v);
let saveErrAt = 0;
function saveNow() {
  clearTimeout(saveT);
  try { localStorage.setItem(KEY, JSON.stringify(S, keepSmall)); }
  catch { if (Date.now() - saveErrAt > 30000) { saveErrAt = Date.now(); toast(T`บันทึกงานในเครื่องไม่สำเร็จ (พื้นที่เต็ม?)`, { kind: 'err' }); } }
}
addEventListener('beforeunload', saveNow);

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

/* ------------------------------------------------------------- packs */
const genPack = () => ({ id: 'generated', name: T`โจทย์ที่สร้างเอง`, problems: S.gen });
const allPacks = () => [BU_FINAL, genPack(), ...S.packs];
const findPack = (id) => allPacks().find((p) => p.id === id);
const findProblem = (packId, pid) => { const p = findPack(packId); return p ? p.problems.find((x) => x.id === pid) : null; };
const docProblem = (doc) => (doc && doc.ref ? findProblem(doc.ref.pack, doc.ref.pid) : null);
const progOf = (pid) => S.progress[pid] || null;

/* ------------------------------------------------------------- docs */
const activeDoc = () => S.docs.find((d) => d.id === S.active) || null;
function newDoc({ name, code = '', files = {}, ref = null, path = null } = {}) {
  const d = { id: uid(), name: name || T`ไม่มีชื่อ`, code, files: { ...files }, origFiles: { ...files }, ref, path, dirty: false };
  S.docs.push(d);
  S.open.push(d.id);
  return d;
}
function openProblem(packId, pid, kind = 'problem') {
  const p = findProblem(packId, pid);
  if (!p) { toast(T`ไม่พบโจทย์นี้แล้ว`, { kind: 'err' }); return; }
  let d = S.docs.find((x) => x.ref && x.ref.pack === packId && x.ref.pid === pid && x.ref.kind === kind);
  if (!d) {
    let code = p.starter || '', name = p.no ? T`ข้อ ${p.no}` : p.title;
    if (kind.startsWith('buggy:')) { const b = p.buggy[+kind.split(':')[1]]; code = b.code; name = T`หาจุดผิด ข้อ ${p.no || ''}`.trim(); }
    if (kind.startsWith('variant:')) { code = p.variants[+kind.split(':')[1]]; name = T`ข้อ ${p.no} (แบบ ${+kind.split(':')[1] + 2})`; }
    d = newDoc({ name, code, files: p.files || {}, ref: { pack: packId, pid, kind } });
  } else if (!S.open.includes(d.id)) S.open.push(d.id);
  activate(d.id);
  showView('code');
  if (S.ui.noprob) setProb(true);
}
// library (คลัง) helpers
function openDoc(id) { if (!S.docs.some((x) => x.id === id)) return; activate(id); showView('code'); }
function newLibDoc(name, folder = null, code = '', files = {}) {
  const d = { id: uid(), name, code, files: { ...files }, origFiles: { ...files }, ref: null, path: null, dirty: false, lib: true, folder: folder || null };
  S.docs.push(d);
  return d;
}
function removeDoc(id) {
  const d = S.docs.find((x) => x.id === id);
  if (!d) return;
  const i = S.open.indexOf(id);
  if (i >= 0) S.open.splice(i, 1);
  S.docs.splice(S.docs.indexOf(d), 1);
  if (S.active === id) {
    if (!S.open.length) { const nd = newDoc({ name: T`ไม่มีชื่อ`, code: '' }); S.active = nd.id; }
    activate(S.open[Math.max(0, i - 1)] || S.open[0]);
  } else renderTabs();
  save();
}
function activate(id) {
  const d = S.docs.find((x) => x.id === id);
  if (!d) return;
  if (!S.open.includes(id)) S.open.push(id);
  S.active = id;
  if (ED) { ED.set(d.code); }
  lastRun = null;
  viz.empty();
  setConsole([]);
  renderTabs(); renderProblem(); renderFiles(); renderCheck(); renderCrumbs();
  save();
}
async function closeDoc(id) {
  const d = S.docs.find((x) => x.id === id);
  if (!d) return;
  if (d.dirty && d.path && !(await confirmBox(T`ปิดโดยไม่บันทึก?`, T`ไฟล์ ${d.name} ยังไม่ได้บันทึกลงเครื่อง (งานยังอยู่ในโปรแกรม เปิดกลับมาได้จากหน้าโจทย์ / เปิดไฟล์)`, T`ปิดแท็บ`))) return;
  const i = S.open.indexOf(id);
  S.open.splice(i, 1);
  // free documents with no code and no problem are thrown away; everything else is kept for later
  if (!d.ref && !d.path && !d.lib && !d.code.trim()) S.docs.splice(S.docs.indexOf(d), 1);
  if (S.active === id) {
    if (!S.open.length) { const nd = newDoc({ name: T`ไม่มีชื่อ`, code: '' }); S.active = nd.id; }
    activate(S.open[Math.max(0, i - 1)] || S.open[0]);
  } else renderTabs();
  save();
}
function renderTabs() {
  const box = $('ed-tabs');
  box.innerHTML = S.open.map((id) => {
    const d = S.docs.find((x) => x.id === id);
    if (!d) return '';
    const p = docProblem(d), ok = p && progOf(p.id) && progOf(p.id).pass;
    return `<div class="ed-tab ${id === S.active ? 'active' : ''} ${d.dirty && d.path ? 'dirty' : ''}" data-id="${id}" title="${esc(d.path || (p ? p.title : d.name))}"><span class="py-ico">${ok ? '✓' : 'py'}</span><span class="nm">${esc(d.name)}</span><button class="x" data-close="${id}">${icon('x')}</button></div>`;
  }).join('') + `<div class="ed-tab new" id="tab-new" title="${T`เอกสารใหม่ (Ctrl+N)`}">${icon('plus')}</div>`;
  box.querySelectorAll('.ed-tab[data-id]').forEach((el) => {
    el.onclick = (e) => { if (e.target.closest('[data-close]')) return; if (el.dataset.id !== S.active) activate(el.dataset.id); };
    el.onauxclick = (e) => { if (e.button === 1) closeDoc(el.dataset.id); };
  });
  box.querySelectorAll('[data-close]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); closeDoc(b.dataset.close); }; });
  $('tab-new').onclick = () => { const d = newDoc({ name: T`ไม่มีชื่อ ${S.docs.filter((x) => !x.ref && !x.path).length + 1}` }); activate(d.id); ED.focus(); };
  const a = box.querySelector('.ed-tab.active');
  if (a) a.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  libBadge();
  refreshLibrary(); // open / active marks in the library
}
function libBadge() { const n = libCount(); $('lib-count').textContent = n || ''; $('lib-count2').textContent = n || ''; }
function renderCrumbs() {
  const d = activeDoc(), p = docProblem(d), pk = d && d.ref ? findPack(d.ref.pack) : null;
  $('crumbs').innerHTML = !d ? '' : p ? `${esc(pk ? pk.name : '')} › <b>${esc(p.no ? T`ข้อ ${p.no}` : p.title)}</b>` : `<b>${esc(d.path || d.name)}</b>`;
}

/* -------------------------------------------------------------- editor */
let ED = null, viz = null, lastRun = null, running = false;
function onCode(code) {
  const d = activeDoc();
  if (!d) return;
  d.code = code;
  if (d.path && !d.dirty) { d.dirty = true; renderTabs(); }
  if (lastRun && lastRun.code !== code) $('con-state').textContent = T`แก้โค้ดแล้ว — กดรันใหม่เพื่อดูผลล่าสุด`;
  if (viz && viz.res && !viz.stale) { viz.pause(); viz.stale = true; } // the picture belongs to the old code
  save();
  clearTimeout(libT); libT = setTimeout(() => { libBadge(); refreshLibrary(); }, 700); // line counts, a new doc that now has code
}
let libT = 0;
function setFont(px) { S.ui.fontSize = ED.fontSize(px); $('font-size').textContent = S.ui.fontSize; save(); }

/* ------------------------------------------------------------ problem pane */
function setProb(show) {
  S.ui.noprob = !show;
  $('ws').classList.toggle('noprob', !show);
  $('prob-show').classList.toggle('hidden', show || S.ui.focus);
  save();
}
function setRight(show) {
  S.ui.noright = !show;
  $('ws').classList.toggle('noright', !show);
  $('btn-right').classList.toggle('on', show);
  clearFlights();
  save();
}
function setFocusMode(on) {
  S.ui.focus = on;
  $('ws').classList.toggle('focus', on);
  $('prob-show').classList.toggle('hidden', !S.ui.noprob || on);
  $('btn-wide').title = on ? T`แสดงแผงข้าง (Ctrl+Alt+B)` : T`ขยายช่องเขียนโค้ด (Ctrl+Alt+B)`;
  save();
}
function renderProblem() {
  const d = activeDoc(), p = docProblem(d);
  const pk = d && d.ref ? findPack(d.ref.pack) : null;
  const foot = $('prob-foot'), body = $('prob-body');
  if (!p) {
    $('prob-pack').textContent = d && d.path ? T`ไฟล์จากเครื่อง` : T`เอกสารเปล่า`;
    $('prob-name').textContent = d ? d.name : '';
    body.innerHTML = `<div class="prob-empty">${icon('book')}<b>${T`ไม่มีโจทย์ผูกกับเอกสารนี้`}</b>${T`เขียนโค้ดอะไรก็ได้แล้วกด F5 รัน หรือ F6 ดูทีละขั้น — เปิดโจทย์จากหน้า "โจทย์" เพื่อให้ตรวจคำตอบได้`}</div>`;
    foot.innerHTML = `<button class="pill-btn small" id="pf-lib">${icon('book')}<span>${T`ไปหน้าโจทย์`}</span></button>`;
    $('pf-lib').onclick = () => showView('library');
    hydrateIcons(body);
    return;
  }
  $('prob-pack').textContent = pk ? pk.name + (p.no ? ' · ' + T`ข้อ ${p.no}` : '') : '';
  $('prob-name').textContent = p.title;
  const kind = d.ref.kind || 'problem';
  let html = '';
  const pr = progOf(p.id);
  html += `<div style="margin:2px 0 6px">${pr ? `<span class="prog-pill ${pr.pass ? '' : 'no'}">${pr.pass ? icon('check') + T`ผ่านแล้ว` : T`ล่าสุด ${pr.best}`}</span>` : ''}</div>`;
  if (kind.startsWith('buggy:')) {
    const b = p.buggy[+kind.split(':')[1]];
    html += `<div class="buggy-banner">${icon('bug')}<div><b>${T`โหมดหาจุดผิด`}</b> — ${T`โค้ดนี้คือ "${b.label}" ที่ยังมีจุดผิดซ่อนอยู่ กด Ctrl+Enter ตรวจคำตอบ ดูว่าเคสไหนพัง แล้วแก้จนผ่านครบทุกเคส`}</div></div>`;
    const shown = S.hintsShown[d.id] || 0;
    html += `<div class="hint-list">${b.hints.slice(0, shown).map((h) => `<div class="hint">${icon('bulb')}<span>${esc(T(h))}</span></div>`).join('')}</div>`;
  }
  html += `<div class="md">${renderMd(p.md, { codeAttrs: (i, text) => { const tag = blockTag(p, i); return tag ? `data-tag="${esc(tag)}"` : ''; } })}</div>`;
  if (p.tests && p.tests.length) html += `<p class="muted" style="font-size:12px;margin-top:12px">${T`มีเคสทดสอบ ${p.tests.length} เคส (รวมค่าขอบที่ข้อสอบชอบออก) — กด Ctrl+Enter เพื่อตรวจ`}</p>`;
  body.innerHTML = html;
  body.scrollTop = 0;
  const btns = [];
  btns.push(`<button class="pill-btn small primary" id="pf-check">${icon('check')}<span>${T`ตรวจคำตอบ`}</span></button>`);
  if (kind.startsWith('buggy:')) {
    const b = p.buggy[+kind.split(':')[1]], shown = S.hintsShown[d.id] || 0;
    if (shown < b.hints.length) btns.push(`<button class="pill-btn small" id="pf-hint">${icon('bulb')}<span>${T`ขอคำใบ้ (${shown + 1}/${b.hints.length})`}</span></button>`);
  } else if (p.buggy && p.buggy.length) {
    btns.push(`<button class="pill-btn small" id="pf-bug">${icon('bug')}<span>${T`หาจุดผิด`}</span></button>`);
  }
  if (p.solution) btns.push(`<button class="pill-btn small" id="pf-sol">${icon('eye')}<span>${T`ดูเฉลย`}</span></button>`);
  if (Object.keys(p.files || {}).length) btns.push(`<button class="pill-btn small" id="pf-reset" title="${T`คืนไฟล์ข้อมูลให้เหมือนตอนเริ่มโจทย์`}">${icon('undo')}<span>${T`คืนไฟล์ตั้งต้น`}</span></button>`);
  foot.innerHTML = btns.join('');
  const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  on('pf-check', () => runCheck());
  on('pf-hint', () => { S.hintsShown[d.id] = (S.hintsShown[d.id] || 0) + 1; save(); renderProblem(); });
  on('pf-bug', () => pickBuggy(p, d.ref.pack));
  on('pf-sol', () => showSolution(p));
  on('pf-reset', () => resetFiles());
}
function blockTag(p, i) {
  // label code blocks in the problem text: sample output / input file / output file
  const lines = String(p.md).split('\n');
  let k = -1, label = '';
  for (let j = 0; j < lines.length; j++) {
    if (/^\s*```\w*\s*$/.test(lines[j])) { k++; if (k === i) break; j++; while (j < lines.length && !/^\s*```\s*$/.test(lines[j])) j++; continue; }
    if (lines[j].trim()) label = lines[j];
  }
  if (/Sample Console Output|ตัวอย่างการทำงาน/i.test(label)) return T`ผลลัพธ์บนหน้าจอ`;
  const fm = /`([\w\-.]+\.txt)`/.exec(label);
  if (fm) return (p.outFiles || []).includes(fm[1]) ? T`ไฟล์ที่ต้องเขียน: ${fm[1]}` : T`ไฟล์ข้อมูล: ${fm[1]} (อยู่ในแท็บไฟล์แล้ว)`;
  return '';
}
async function pickBuggy(p, packId) {
  if (p.buggy.length === 1) { openProblem(packId, p.id, 'buggy:0'); return; }
  const html = `<h3>${T`เลือกโค้ดที่จะหาจุดผิด`}</h3><div class="hint-list">${p.buggy.map((b, i) => `<button class="pill-btn" data-b="${i}">${icon('bug')}<span>${esc(T(b.label))}</span></button>`).join('')}</div><div class="modal-btns"><button class="pill-btn" data-x>${T`ยกเลิก`}</button></div>`;
  htmlBox(html, (m, close) => {
    m.querySelector('[data-x]').onclick = () => close(null);
    m.querySelectorAll('[data-b]').forEach((b) => { b.onclick = () => { close(null); openProblem(packId, p.id, 'buggy:' + b.dataset.b); }; });
  });
}
async function showSolution(p) {
  const pr = progOf(p.id);
  if (!(pr && pr.pass) && !(await confirmBox(T`ดูเฉลยเลยไหม?`, T`ลองเขียนเองก่อนจะจำได้ดีกว่ามาก — ถ้าติดจริงๆ ค่อยดู แล้วลองปิดเฉลยเขียนใหม่เองอีกรอบ`, T`ดูเฉลย`))) return;
  htmlBox(`<h3>${T`เฉลย`} — ${esc(p.title)}</h3><div class="sol-view" id="sol-view"></div>
    <div class="modal-btns"><button class="pill-btn" data-x>${T`ปิด`}</button><button class="pill-btn" id="sol-viz">${icon('anim')}<span>${T`ดูเฉลยทำงานทีละขั้น`}</span></button><button class="pill-btn primary" id="sol-copy">${icon('copy')}<span>${T`เปิดเฉลยในแท็บใหม่`}</span></button></div>`, (m, close) => {
    m.querySelector('.modal-card').classList.add('wide');
    createViewer(m.querySelector('#sol-view'), p.solution, 14);
    m.querySelector('[data-x]').onclick = () => close(null);
    m.querySelector('#sol-copy').onclick = () => { close(null); const d = newDoc({ name: T`เฉลย ข้อ ${p.no || ''}`.trim(), code: p.solution, files: p.files || {} }); activate(d.id); };
    m.querySelector('#sol-viz').onclick = async () => {
      close(null);
      const d = newDoc({ name: T`เฉลย ข้อ ${p.no || ''}`.trim(), code: p.solution, files: p.files || {} });
      activate(d.id);
      const t = (p.tests || [])[0] || {};
      runTrace({ stdin: t.stdin || [], files: { ...(p.files || {}), ...(t.files || {}) }, play: true, interactive: false });
    };
  });
}
function resetFiles() {
  const d = activeDoc(), p = docProblem(d);
  d.files = { ...((p && p.files) || d.origFiles || {}) };
  renderFiles(); save();
  toast(T`คืนไฟล์ตั้งต้นแล้ว`);
}

/* ---------------------------------------------------------------- console */
let pendingInput = null, conTail = '';
// tail: also show the end-of-run messages (traceback, Thai explanation, "[finished]")
function setConsole(out, { hideOut = false, tail = false } = {}) {
  const box = $('console-out');
  box.innerHTML = out.map(([k, t]) => {
    if (k === 'out' && hideOut) return `<span class="c-hidden">${esc(t.replace(/[^\n]/g, ' '))}</span>`;
    return `<span class="${k === 'in' ? 'c-in' : k === 'err' ? 'c-err' : ''}">${esc(t)}</span>`;
  }).join('') + (tail ? conTail : '');
  if (tail) wireGoto(box);
  box.scrollTop = box.scrollHeight;
}
function conAppend(html) { const box = $('console-out'); box.insertAdjacentHTML('beforeend', html); box.scrollTop = box.scrollHeight; }
function askInput() {
  return new Promise((resolve) => {
    const box = $('console-out');
    const inp = document.createElement('input');
    inp.className = 'c-input'; inp.spellcheck = false; inp.autocomplete = 'off';
    box.appendChild(inp);
    box.scrollTop = box.scrollHeight;
    setTimeout(() => inp.focus(), 30);
    $('con-state').textContent = T`รอให้พิมพ์ค่าแล้วกด Enter (Esc = หยุด)`; $('con-state').className = 'con-state run';
    const done = (v) => { pendingInput = null; inp.remove(); resolve(v); };
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); done(inp.value); }
      else if (e.key === 'Escape') { e.preventDefault(); done(null); }
    };
    pendingInput = { done, inp };
  });
}
$('console-out') && $('console-out').addEventListener('pointerup', () => { if (pendingInput && !getSelection().toString()) pendingInput.inp.focus(); });
function tracebackText(err, fileName) {
  if (!err) return '';
  if (err.type === 'SyntaxError' || err.type === 'IndentationError' || err.type === 'TabError') return (err.text || '').replace(/<prism>/g, fileName) + '\n';
  if (['TooManySteps', 'TooSlow', 'Stopped', 'Internal'].includes(err.type)) return '';
  let s = 'Traceback (most recent call last):\n';
  for (const f of err.tb || []) s += f.more ? `  [Previous line repeated ${f.more} more times]\n` : `  File "${fileName}", line ${f.ln}, in ${f.fn}\n    ${f.src}\n`;
  return s + (err.text || `${err.type}: ${err.msg}`) + '\n';
}
function errorCard(err, code) {
  const ex = explain(err, code);
  if (!ex) return '';
  return `<div class="err-card"><b class="t">${esc(ex.title)}</b>${ex.why ? `<div>${esc(ex.why)}</div>` : ''}${ex.fix ? `<div class="fix">${icon('bulb')}<span>${esc(ex.fix)}</span></div>` : ''}${err.line ? `<button data-goto="${err.line}">${T`ไปที่บรรทัด ${err.line}`}</button>` : ''}</div>`;
}
function wireGoto(root) {
  root.querySelectorAll('[data-goto]').forEach((b) => { b.onclick = () => { const n = +b.dataset.goto; ED.scrollToLine(n); const l = ED.view.state.doc.line(Math.min(n, ED.view.state.doc.lines)); ED.view.dispatch({ selection: { anchor: l.from + (l.text.search(/\S/) + 1 || 1) - 1 } }); ED.focus(); }; });
}
function setRunning(on, label) {
  running = on;
  $('btn-stop').classList.toggle('hidden', !on);
  ['btn-run', 'btn-viz', 'btn-check'].forEach((id) => { $(id).disabled = on; });
  $('con-state').className = 'con-state' + (on ? ' run' : '');
  $('con-state').textContent = on ? (label || T`กำลังทำงาน…`) : '';
}

/* ------------------------------------------------------------- running */
const fileNameOf = (d) => (d && d.path ? d.path.split(/[\\/]/).pop() : 'main.py');
// Runs the active document. input() is answered in the console: when the program asks, the page asks the user
// and runs the program again from the top with one more answer (output looks continuous).
async function runTrace({ stdin = [], files = null, play = false, interactive = true, sample, predict = false } = {}) {
  const d = activeDoc();
  if (!d || running) return null;
  const code = ED.get();
  const start = { ...(files || d.files) };
  const inputs = [...stdin];
  const seed = (Math.random() * 1e9) >>> 0;
  ED.clearMarks(); clearFlights(); viz.pause();
  setConsole([]);
  setRunning(true);
  let res;
  for (;;) {
    res = await runPython({ code, stdin: inputs, files: start, trace: true, seed, sample });
    if (res.stopped) break;
    setConsole(res.out || [], { hideOut: predict });
    if (res.needInput && interactive) {
      const v = await askInput();
      if (v === null) { res = { ...res, stopped: true, error: { type: 'Stopped', msg: '', line: null, tb: [] } }; break; }
      inputs.push(v);
      continue;
    }
    break;
  }
  setRunning(false);
  lastRun = { res, code, start, inputs, doc: d.id };
  if (predict) return lastRun;
  showResult(lastRun, { play });
  return lastRun;
}
function showResult(run, { play = false } = {}) {
  const { res, code, start } = run;
  const d = activeDoc();
  const err = res.error;
  let tail = '';
  if (res.needInput) tail += `<span class="c-sys">${esc(T`[โปรแกรมรอค่าจาก input() — ยังไม่ได้ใส่ค่า]`)}</span>\n`;
  if (err && err.type !== 'Stopped') {
    tail += `<span class="c-err">${esc(tracebackText(err, fileNameOf(d)))}</span>` + errorCard(err, code);
    $('con-state').textContent = T`มีข้อผิดพลาด`; $('con-state').className = 'con-state bad';
  } else if (err && err.type === 'Stopped') {
    tail += `<span class="c-sys">${esc(T`[หยุดโปรแกรมแล้ว]`)}</span>\n`;
  } else {
    tail += `<span class="c-sys">${esc(T`[จบโปรแกรม · ${res.count || 0} ขั้น · ${res.ms || 0} ms]`)}</span>\n`;
    if ((res.unclosed || []).length) tail += `<span class="c-sys">${esc(T`[ลืม close() ไฟล์: ${res.unclosed.join(', ')} — Python ปิดให้ตอนจบ แต่ตอนสอบควรปิดเอง]`)}</span>\n`;
  }
  if (res.outCut) tail += `<span class="c-sys">${esc(T`[ข้อความที่แสดงยาวเกิน 200,000 ตัวอักษร — ตัดส่วนที่เหลือทิ้ง]`)}</span>\n`;
  if (res.truncated) tail += `<span class="c-sys">${esc(T`[ภาพทีละขั้นแสดงเฉพาะ ${res.steps.length} ขั้นแรก]`)}</span>\n`;
  conTail = tail;
  setConsole(res.out || [], { tail: true });
  if (!res.steps.length && err && err.line) ED.marks({ err: err.line, errMsg: `${err.type}: ${err.msg}` });
  // files the program wrote stay, like on a real disk
  if (d && res.files && d.id === run.doc) {
    const nf = {};
    for (const [k, v] of Object.entries(res.files)) if (v !== null) nf[k] = v;
    d.files = nf;
    renderFiles();
    save();
  }
  viz.load(res, code, start);
  if (play) { setRTab('viz'); viz.play(); }
  else if (res.steps.length) { viz.last(); ED.marks({ exec: 0, prev: 0 }); }
  const n = res.steps.length;
  updateVizBar();
  if (!play && n && S.ui.rtab === 'check' && !docProblem(d)) setRTab('viz');
}
function stopAll() {
  if (pendingInput) { pendingInput.done(null); return; }
  if (running || isBusy()) { stopPython(); setRunning(false); }
  viz.pause();
}
async function runNormal() { if (S.ui.predict) return predictFlow(false); return runTrace({ play: false }); }
async function runVisual() { if (S.ui.predict) return predictFlow(true); return runTrace({ play: true }); }

/* ------------------------------------------------------- predict before run */
async function predictFlow(visual) {
  $('con-state').textContent = T`โหมดทายก่อนรัน: ใส่ค่าที่โปรแกรมถามก่อน ผลลัพธ์จะถูกซ่อนไว้`;
  const run = await runTrace({ predict: true });
  if (!run || run.res.stopped) return;
  const printed = (run.res.out || []).filter((o) => o[0] === 'out').map((o) => o[1]).join('');
  const guess = await htmlBox(`<h3>${icon('brain')} ${T`ทายก่อนว่าโปรแกรมจะแสดงอะไร`}</h3>
      <p class="muted">${T`พิมพ์เฉพาะสิ่งที่ print() แสดงออกมา (ไม่ต้องพิมพ์ข้อความที่ input() ถาม) — แต่ละบรรทัดขึ้นบรรทัดใหม่`}</p>
      ${run.inputs.length ? `<div class="pred-in">${T`ค่าที่คุณใส่`}: ${run.inputs.map((v) => `<b>${esc(v)}</b>`).join(', ')}</div>` : ''}
      <textarea class="pred" id="pred-text" spellcheck="false" placeholder="${T`เช่น Net payment = 2250.00 Baht`}"></textarea>
      <div class="modal-btns"><button class="pill-btn" data-x>${T`ข้าม ไม่ทาย`}</button><button class="pill-btn primary" id="pred-ok">${icon('check')}<span>${T`ตรวจคำทาย (Ctrl+Enter)`}</span></button></div>`, (m, close) => {
    const ta = m.querySelector('#pred-text');
    setTimeout(() => ta.focus(), 50);
    m.querySelector('[data-x]').onclick = () => close(null);
    const ok = () => close(ta.value);
    m.querySelector('#pred-ok').onclick = ok;
    ta.onkeydown = (e) => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); ok(); } };
  });
  if (guess !== null) {
    const norm = (s) => s.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
    const right = norm(guess) === norm(printed);
    S.quiz.total++; if (right) { S.quiz.right++; S.quiz.streak++; S.quiz.best = Math.max(S.quiz.best, S.quiz.streak); } else S.quiz.streak = 0;
    save();
    await new Promise((resolve) => htmlBox(`<div class="q-res"><div class="verdict ${right ? 'ok' : 'bad'}">${icon(right ? 'check' : 'x')}<span>${right ? T`ทายถูก! เก่งมาก` : T`ยังไม่ตรง — ลองดูว่าต่างตรงไหน`}</span></div>
        ${right ? '' : diffHtml(guess, printed, { leftLabel: T`ที่คุณทาย`, rightLabel: T`ที่โปรแกรมแสดงจริง` })}</div>
        <div class="modal-btns"><button class="pill-btn" data-x>${T`ปิด`}</button><button class="pill-btn primary" id="pr-viz">${icon('anim')}<span>${T`ดูทีละขั้นว่าทำไม`}</span></button></div>`, (m, close) => {
      m.querySelector('.modal-card').classList.add('wide');
      if (right) m.querySelector('.modal-card').classList.add('celebrate');
      m.querySelector('[data-x]').onclick = () => close(false);
      m.querySelector('#pr-viz').onclick = () => close(true);
    }).then((v) => { visual = visual || v; resolve(); }));
  }
  showResult(run, { play: visual });
}

/* ------------------------------------------------------------ viz controls */
function updateVizBar(v = viz) {
  if (!v) return;
  const n = v.count, i = Math.max(0, v.i);
  $('vz-slider').max = Math.max(0, n - 1);
  $('vz-slider').value = i;
  $('vz-count').textContent = n ? `${i + 1} / ${n}` : '0 / 0';
  $('vz-play').innerHTML = icon(v.playing ? 'pause' : 'play');
  ['vz-first', 'vz-prev', 'vz-next', 'vz-last', 'vz-play', 'vz-slider'].forEach((id) => { $(id).disabled = !n; });
}
function setRTab(t) {
  S.ui.rtab = t;
  document.querySelectorAll('#r-tabs .tab').forEach((b) => b.classList.toggle('active', b.dataset.r === t));
  document.querySelectorAll('.r-pane').forEach((p) => p.classList.toggle('on', p.id === 'r-' + t));
  if (t !== 'viz') clearFlights();
  if (t === 'lib') refreshLibrary(); // the name rail measures the list once it is visible
  save();
}

/* ------------------------------------------------------------------ files */
let fileSel = null;
function renderFiles() {
  const d = activeDoc(), p = docProblem(d);
  const box = $('r-files');
  const names = d ? Object.keys(d.files).sort() : [];
  $('files-count').textContent = names.length || '';
  if (!d) { box.innerHTML = ''; return; }
  if (fileSel && !names.includes(fileSel)) fileSel = null;
  const outs = new Set((p && p.outFiles) || []);
  const kb = (s) => (s.length < 1024 ? `${s.length} B` : `${(s.length / 1024).toFixed(1)} KB`);
  box.innerHTML = `<div class="files-tools">
      <button class="pill-btn small" id="f-new">${icon('plus')}<span>${T`ไฟล์ใหม่`}</span></button>
      <button class="pill-btn small" id="f-import">${icon('open')}<span>${T`นำไฟล์เข้าจากเครื่อง`}</span></button>
      ${Object.keys((p && p.files) || d.origFiles || {}).length ? `<button class="pill-btn small" id="f-reset">${icon('undo')}<span>${T`คืนไฟล์ตั้งต้น`}</span></button>` : ''}
    </div>
    <p class="muted" style="font-size:12px;margin:0 0 8px">${T`นี่คือโฟลเดอร์ที่โปรแกรมเห็น — open("ชื่อไฟล์") จะอ่าน / เขียนไฟล์ในนี้ ไฟล์ที่โปรแกรมเขียนจะอยู่ต่อเหมือนในเครื่องจริง`}</p>
    ${names.length ? names.map((n) => `<div class="file-row ${n === fileSel ? 'on' : ''}" data-f="${esc(n)}">${icon('file')}<b>${esc(n)}</b>${outs.has(n) ? `<span class="tag out">${T`โปรแกรมเขียน`}</span>` : (p && p.files && p.files[n] !== undefined ? `<span class="tag">${T`ข้อมูลโจทย์`}</span>` : '')}<small>${kb(d.files[n] || '')}</small></div>`).join('')
      : `<div class="files-empty">${icon('folder')}<br>${T`ยังไม่มีไฟล์ — สร้างไฟล์ใหม่ หรือรันโปรแกรมที่เขียนไฟล์ แล้วไฟล์จะมาโผล่ที่นี่`}</div>`}
    ${fileSel ? `<div class="file-edit"><div class="fe-h">${icon('edit')}<b>${esc(fileSel)}</b><span class="ed-fill"></span>
        <button class="pill-btn small" id="fe-save">${icon('download')}<span>${T`บันทึกลงเครื่อง`}</span></button>
        <button class="pill-btn small" id="fe-ren">${icon('edit')}<span>${T`เปลี่ยนชื่อ`}</span></button>
        <button class="pill-btn small warn" id="fe-del">${icon('trash')}<span>${T`ลบ`}</span></button></div>
      <textarea id="fe-text" spellcheck="false"></textarea></div>` : ''}`;
  box.querySelectorAll('[data-f]').forEach((el) => { el.onclick = () => { fileSel = el.dataset.f === fileSel ? null : el.dataset.f; renderFiles(); }; });
  $('f-new').onclick = async () => {
    const n = await promptBox(T`ชื่อไฟล์ใหม่`, 'data.txt');
    if (!n) return;
    if (!/^[^\\/:*?"<>|]+$/.test(n)) { toast(T`ชื่อไฟล์มีตัวอักษรที่ใช้ไม่ได้`, { kind: 'err' }); return; }
    d.files[n] = d.files[n] ?? ''; fileSel = n; renderFiles(); save();
    setTimeout(() => $('fe-text') && $('fe-text').focus(), 30);
  };
  $('f-import').onclick = () => importDataFiles();
  if ($('f-reset')) $('f-reset').onclick = resetFiles;
  if (fileSel) {
    const ta = $('fe-text');
    ta.value = d.files[fileSel] ?? '';
    ta.oninput = () => { d.files[fileSel] = ta.value; save(); };
    ta.onkeydown = (e) => { if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('    ', s, ta.selectionEnd, 'end'); ta.oninput(); } };
    $('fe-del').onclick = async () => { if (await confirmBox(T`ลบไฟล์ ${fileSel}?`, T`ลบออกจากโฟลเดอร์งานของเอกสารนี้ (ไม่กระทบไฟล์ในเครื่อง)`, T`ลบ`, true)) { delete d.files[fileSel]; fileSel = null; renderFiles(); save(); } };
    $('fe-ren').onclick = async () => {
      const n = await promptBox(T`ชื่อใหม่`, fileSel);
      if (!n || n === fileSel) return;
      d.files[n] = d.files[fileSel]; delete d.files[fileSel]; fileSel = n; renderFiles(); save();
    };
    $('fe-save').onclick = () => saveTextAs(fileSel, d.files[fileSel] ?? '');
  }
}

/* ------------------------------------------------------------------ checking */
let lastCheck = null;
function renderCheck(results, running2) {
  const d = activeDoc(), p = docProblem(d), box = $('r-check');
  if (!p) { box.innerHTML = `<div class="files-empty">${icon('check')}<br>${T`เอกสารนี้ไม่มีโจทย์ จึงยังตรวจคำตอบไม่ได้ — เปิดโจทย์จากหน้า "โจทย์" หรือเปิดไฟล์ .ipynb ที่มีตัวอย่างผลลัพธ์`}</div>`; $('check-badge').textContent = ''; return; }
  if (!p.tests || !p.tests.length) { box.innerHTML = `<div class="files-empty">${icon('check')}<br>${T`โจทย์นี้ไม่มีตัวอย่างผลลัพธ์ให้ตรวจ`}</div>`; return; }
  results = results || (lastCheck && lastCheck.doc === d.id ? lastCheck.results : null);
  if (!results) { box.innerHTML = `<div class="files-empty">${icon('check')}<br>${T`กด Ctrl+Enter หรือปุ่ม "ตรวจคำตอบ" เพื่อรันโค้ดกับเคสทดสอบ ${p.tests.length} เคส`}</div>`; $('check-badge').textContent = ''; return; }
  const pass = results.filter((r) => r.pass).length, total = p.tests.length, done = results.length;
  const frac = done ? pass / total : 0, C = 2 * Math.PI * 22;
  const all = !running2 && pass === total;
  let html = `<div class="chk-sum ${all ? 'all' : ''}"><div class="chk-ring"><svg viewBox="0 0 54 54"><circle cx="27" cy="27" r="22" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="6"/><circle cx="27" cy="27" r="22" fill="none" stroke="${all ? '#3fcfa4' : 'url(#chkgrad)'}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C * frac} ${C}"/><defs><linearGradient id="chkgrad"><stop offset="0" stop-color="#8ea2ff"/><stop offset="1" stop-color="#ff9ec7"/></linearGradient></defs></svg><b>${pass}/${total}</b></div>
    <div><h4>${running2 ? T`กำลังตรวจ… (${done}/${total})` : all ? T`ผ่านครบทุกเคส!` : T`ผ่าน ${pass} จาก ${total} เคส`}</h4><p>${running2 ? T`รันโค้ดของคุณกับเคสทดสอบทีละเคส` : all ? T`เยี่ยม — ลองปิดเฉลยแล้วเขียนใหม่เองอีกรอบ หรือสร้างโจทย์ใหม่แนวเดียวกัน` : T`กดที่เคสสีแดงเพื่อดูว่าผลลัพธ์ต่างจากที่ถูกตรงไหน`}</p></div></div>`;
  results.forEach((r, i) => {
    const why = r.pass ? (r.warn.length ? T`ผ่าน (มีข้อสังเกต)` : '') : r.reason === 'error' ? (r.res.error ? r.res.error.type : '') : r.reason === 'input' ? T`ถาม input() เกินมา` : r.reason === 'nofile' ? T`ไม่ได้สร้างไฟล์` : r.reason === 'file' ? T`ไฟล์ไม่ตรง` : T`ผลลัพธ์ไม่ตรง`;
    const open = !r.pass && results.findIndex((x) => !x.pass) === i;
    html += `<div class="chk-row ${r.pass ? 'ok' : 'bad'}" data-i="${i}"><button data-tog="${i}"><span class="chk-ic">${icon(r.pass ? 'check' : 'x')}</span><span>${esc(T(r.test.name))}</span><span class="why">${esc(why)}</span></button>
      <div class="chk-body ${open ? '' : 'hidden'}">${checkDetail(r, p, d)}</div></div>`;
  });
  if (running2) for (let k = done; k < total; k++) html += `<div class="chk-row run"><button><span class="chk-ic"></span><span>${esc(T(p.tests[k].name))}</span></button></div>`;
  box.innerHTML = html;
  box.querySelectorAll('[data-tog]').forEach((b) => { b.onclick = () => b.nextElementSibling.classList.toggle('hidden'); });
  box.querySelectorAll('[data-vt]').forEach((b) => { b.onclick = () => vizTest(results[+b.dataset.vt].test, p); });
  wireGoto(box);
  $('check-badge').textContent = running2 ? '…' : `${pass}/${total}`;
  $('check-badge').className = 'r-badge ' + (running2 ? '' : all ? 'ok' : 'bad');
}
function checkDetail(r, p, d) {
  let h = '';
  const t = r.test;
  if (t.stdin && t.stdin.length) h += `<h6>${T`ค่าที่ป้อนให้ input()`}</h6><div class="chk-in">${t.stdin.map((x) => esc(x)).join(' ⏎ ')}</div>`;
  for (const [f, txt] of Object.entries(t.files || {})) h += `<h6>${T`ไฟล์ ${f} ที่ใช้ทดสอบ`}</h6><div class="dcol"><pre>${esc(txt)}</pre></div>`;
  if (r.res.error && r.res.error.type) h += errorCard(r.res.error, d.code).replace('err-card', 'err-card chk');
  if (r.reason === 'input') h += `<div class="chk-warn">${icon('warn')}<span>${T`โปรแกรมขอค่าจาก input() มากกว่าที่โจทย์ให้ (ถาม: "${esc(r.prompt)}")`}</span></div>`;
  h += `<h6>${T`ผลลัพธ์บนหน้าจอ`}</h6>` + diffHtml(r.got, r.exp);
  for (const f of r.files) h += `<h6>${T`ไฟล์ ${f.name}`} ${f.pass ? '✓' : ''}</h6>` + (f.pass ? `<div class="dcol"><pre>${esc(f.have)}</pre></div>` : diffHtml(f.have, f.want));
  for (const w of r.warn) h += `<div class="chk-warn">${icon('warn')}<span>${esc(w)}</span></div>`;
  h += `<div class="chk-actions"><button class="pill-btn small" data-vt="${p.tests.indexOf(t)}">${icon('anim')}<span>${T`ดูเคสนี้ทำงานทีละขั้น`}</span></button></div>`;
  return h;
}
async function runCheck() {
  const d = activeDoc(), p = docProblem(d);
  if (!d) return;
  setRTab('check');
  if (!p || !p.tests || !p.tests.length) { renderCheck(); return; }
  if (running) return;
  const code = ED.get();
  setRunning(true, T`กำลังตรวจคำตอบ…`);
  renderCheck([], true);
  const partial = [];
  const results = await checkAll(code, p, (r) => { partial.push(r); renderCheck(partial, true); });
  setRunning(false);
  lastCheck = { doc: d.id, results };
  renderCheck(results, false);
  const pass = results.filter((r) => r.pass).length;
  const prev = S.progress[p.id];
  S.progress[p.id] = { pass: pass === results.length || !!(prev && prev.pass), best: `${Math.max(pass, prev ? +String(prev.best).split('/')[0] || 0 : 0)}/${results.length}`, at: Date.now(), last: `${pass}/${results.length}` };
  save();
  renderTabs();
  if (pass === results.length) toast(T`ผ่านครบ ${pass} เคส! 🎉`);
  // the first failing case is shown on the editor too
  const bad = results.find((r) => !r.pass && r.res.error && r.res.error.line);
  if (bad) ED.marks({ err: bad.res.error.line, errMsg: `${bad.res.error.type}: ${bad.res.error.msg}` });
}
async function vizTest(test, p) {
  const files = { ...(p.files || {}), ...(test.files || {}) };
  await runTrace({ stdin: test.stdin || [], files, play: true, interactive: false, sample: test.sample });
}

/* -------------------------------------------------------- opening files */
async function openFromDisk() {
  if (native) {
    const path = await api.invoke('pick:open', 'code');
    if (path) await openPath(path);
    return;
  }
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.py,.ipynb,.txt'; inp.multiple = true;
  inp.onchange = async () => { for (const f of inp.files) await openText(f.name, await f.text(), null, {}); };
  inp.click();
}
async function openPath(path) {
  const r = await api.invoke('fs:read', path);
  if (!r || !r.ok) { toast(r && r.reason === 'big' ? T`ไฟล์ใหญ่เกินไป (เกิน 5 MB)` : T`เปิดไฟล์ไม่ได้`, { kind: 'err' }); return; }
  // text files next to a .py are what open("…") will look for
  let side = {};
  if (/\.py$/i.test(path) || /\.ipynb$/i.test(path)) {
    const dir = path.replace(/[\\/][^\\/]*$/, '');
    const list = (await api.invoke('fs:list', dir)) || [];
    // files the code names (open("data.txt")) come first; other small ones only up to a budget — a Downloads
    // folder full of big .txt files must not fill the saved data
    const named = list.filter((f) => r.text.includes(f.name));
    const rest = list.filter((f) => !r.text.includes(f.name) && f.size <= 64 * 1024);
    let budget = 1000000;
    for (const f of [...named, ...rest].slice(0, 30)) {
      if (f.size > budget) continue;
      const t = await api.invoke('fs:read', f.path);
      if (t && t.ok) { side[f.name] = t.text; budget -= f.size; }
    }
  }
  await openText(r.name, r.text, path, side);
}
async function openText(name, text, path, sideFiles) {
  if (/\.ipynb$/i.test(name) || looksLikeNotebook(text)) {
    let pack;
    try { pack = packFromNotebook(text, name); } catch { toast(T`อ่านไฟล์ ${name} ไม่ได้ — ไฟล์ .ipynb อาจเสีย`, { kind: 'err' }); return; }
    for (const pr of pack.problems) pr.files = { ...sideFiles, ...pr.files };
    pack.path = path;
    const old = S.packs.findIndex((x) => (path && x.path === path) || x.sub === pack.sub);
    if (old >= 0) S.packs.splice(old, 1, { ...pack, id: S.packs[old].id, problems: pack.problems.map((pr, i) => ({ ...pr, id: `${S.packs[old].id}-${i + 1}` })) });
    else S.packs.unshift(pack);
    save();
    const pk = old >= 0 ? S.packs[old] : pack;
    toast(T`เปิด ${name} แล้ว — ${pk.problems.length} ส่วน อยู่ในหน้า "โจทย์"`);
    showView('library');
    renderLibrary();
    setTimeout(() => { const el = document.querySelector(`[data-pack="${pk.id}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
    return;
  }
  if (/\.txt$/i.test(name)) {
    const d = activeDoc();
    if (d) { d.files[name] = text; fileSel = name; renderFiles(); setRTab('files'); save(); toast(T`เพิ่ม ${name} เข้าโฟลเดอร์งานแล้ว`); }
    return;
  }
  let d = path ? S.docs.find((x) => x.path === path) : null;
  const known = !!d;
  if (d) { if (!d.dirty) d.code = text; }
  else { d = newDoc({ name, code: text.replace(/\r\n?/g, '\n'), files: sideFiles, path }); d.lib = true; }
  // every .py opened from the PC is kept in the library (คลัง); dropped on the Library page it stays on that page
  const onLibPage = $('view-library').classList.contains('active') && S.ui.libTab === 'files';
  if (onLibPage) { S.open.includes(d.id) || S.open.push(d.id); renderTabs(); save(); }
  else { activate(d.id); showView('code'); }
  flashRow(`[data-did="${d.id}"]`);
  if (Object.keys(sideFiles || {}).length) toast(T`โหลดไฟล์ .txt ${Object.keys(sideFiles).length} ไฟล์จากโฟลเดอร์เดียวกันมาให้ด้วย (แท็บไฟล์)`);
  else if (!known) toast(T`เก็บ ${d.name} ไว้ในคลังแล้ว`);
}
async function importDataFiles() {
  const d = activeDoc();
  if (!d) return;
  if (native) {
    const path = await api.invoke('pick:open', 'data');
    if (!path) return;
    const r = await api.invoke('fs:read', path);
    if (!r || !r.ok) { toast(T`เปิดไฟล์ไม่ได้`, { kind: 'err' }); return; }
    d.files[r.name] = r.text; fileSel = r.name; renderFiles(); save();
    return;
  }
  const inp = document.createElement('input');
  inp.type = 'file'; inp.multiple = true;
  inp.onchange = async () => { for (const f of inp.files) d.files[f.name] = await f.text(); renderFiles(); save(); };
  inp.click();
}
async function saveTextAs(name, text) {
  if (native) {
    const path = await api.invoke('pick:save', name);
    if (!path) return null;
    const r = await api.invoke('fs:write', { path, text });
    if (r && r.ok) toast(T`บันทึกแล้ว: ${path}`); else toast(T`บันทึกไม่สำเร็จ`, { kind: 'err' });
    return r && r.ok ? path : null;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = name; a.click();
  return null;
}
async function saveDoc() {
  const d = activeDoc();
  if (!d) return;
  d.code = ED.get();
  if (d.path && native) {
    const r = await api.invoke('fs:write', { path: d.path, text: d.code });
    if (r && r.ok) { d.dirty = false; renderTabs(); toast(T`บันทึก ${d.name} แล้ว`); } else toast(T`บันทึกไม่สำเร็จ`, { kind: 'err' });
  } else {
    const base = (d.name || 'main').replace(/[\\/:*?"<>|]/g, '_').replace(/\.py$/i, '');
    const p = await saveTextAs(base + '.py', d.code);
    if (p) { d.path = p; d.name = p.split(/[\\/]/).pop(); d.dirty = false; renderTabs(); renderCrumbs(); }
  }
  save();
}

/* ---------------------------------------------------------------- library */
const topicChips = (ts) => (ts || []).map((t) => `<span>${esc(T(TOPIC_NAMES[t] || t))}</span>`).join('');
function renderLibrary() {
  const hidden = S.hiddenPacks || [];
  const packs = [BU_FINAL, ...S.packs].filter((pk) => !hidden.includes(pk.id));
  let h = '';
  for (const pk of packs) {
    const done = pk.problems.filter((p) => progOf(p.id) && progOf(p.id).pass).length;
    h += `<div class="pack" data-pack="${pk.id}" data-mark="${esc(pk.name)}" data-mark-sub="${T`${pk.problems.length} ข้อ · ผ่านแล้ว ${done}`}"><div class="pack-head"><div class="pack-name">${esc(pk.name)}</div><div class="pack-sub">${esc(pk.sub || '')}</div>
      <div class="pack-prog">${T`ผ่านแล้ว ${done}/${pk.problems.length} ข้อ`}</div><button class="icon-btn" data-delpack="${pk.id}" title="${T`เอาชุดนี้ออก`}">${icon('trash')}</button></div>
      ${pk.intro ? `<details class="pack-intro glass md"><summary>${T`ขอบเขตเนื้อหา`}</summary>${renderMd(pk.intro)}</details>` : ''}
      <div class="pgrid">${pk.problems.map((p, i) => problemCard(pk, p, i)).join('')}</div></div>`;
  }
  if (!packs.length) h += `<div class="lb-empty">${icon('book')}<b>${T`ยังไม่มีชุดโจทย์`}</b><span>${T`เปิดไฟล์ .ipynb เพื่อเพิ่มชุดโจทย์ หรือสร้างโจทย์ใหม่ด้านล่าง`}</span></div>`;
  h += `<div class="lib-sec" data-mark="${T`สร้างโจทย์ใหม่`}">${icon('sparkle')}<span>${T`สร้างโจทย์ใหม่แนวเดียวกับข้อสอบ (ตัวเลขใหม่ทุกครั้ง)`}</span></div>
    <div class="gen-row">${TEMPLATES.map((t) => `<button class="gen-btn glass" data-gen="${t.key}"><span class="gi">${icon(t.icon)}</span><span>${esc(T(t.name))}<small>${T`มีเฉลย + เคสทดสอบให้ครบ`}</small></span></button>`).join('')}
      <button class="gen-btn glass" data-gen="any"><span class="gi">${icon('dice')}</span><span>${T`สุ่มแบบไหนก็ได้`}<small>${T`ฝึกแบบไม่รู้ล่วงหน้าเหมือนวันสอบ`}</small></span></button></div>`;
  if (S.gen.length) {
    const gp = genPack();
    h += `<div class="pack" data-pack="generated" style="margin-top:18px" data-mark="${esc(gp.name)}" data-mark-sub="${T`${S.gen.length} ข้อ`}"><div class="pack-head"><div class="pack-name" style="font-size:22px">${esc(gp.name)}</div><div class="pack-sub"></div>
      <button class="pill-btn small" id="gen-clear">${icon('trash')}<span>${T`ล้างทั้งหมด`}</span></button></div>
      <div class="pgrid">${S.gen.slice().reverse().map((p, i) => problemCard(gp, p, i)).join('')}</div></div>`;
  }
  h += `<div class="drop-hint">${icon('open')} ${T`ลากไฟล์ .ipynb หรือ .py มาวางที่หน้าต่างนี้ได้เลย — ไฟล์ .ipynb จะถูกแยกเป็นโจทย์ทีละข้อ พร้อมไฟล์ข้อมูลและตัวอย่างผลลัพธ์ให้ตรวจ`}</div>`;
  const gone = [BU_FINAL, ...S.packs].filter((pk) => hidden.includes(pk.id));
  if (gone.length) h += `<div class="pack-gone">${icon('eyeoff')}<span>${T`ชุดที่เอาออกไว้:`}</span>${gone.map((pk) => `<button class="pill-btn small" data-unhide="${pk.id}">${icon('undo')}<span>${T`เอา ${pk.name} กลับมา`}</span></button>`).join('')}</div>`;
  const box = $('lib');
  box.innerHTML = h;
  box.querySelectorAll('[data-unhide]').forEach((b) => { b.onclick = () => { S.hiddenPacks = hidden.filter((x) => x !== b.dataset.unhide); save(); renderLibrary(); toast(T`เอาชุดโจทย์กลับมาแล้ว`); }; });
  requestAnimationFrame(() => pageRail && pageRail.build());
  box.querySelectorAll('[data-open]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); const [pk, pid, kind] = b.dataset.open.split('|'); if (kind === 'buggy') pickBuggy(findProblem(pk, pid), pk); else openProblem(pk, pid, kind || 'problem'); }; });
  box.querySelectorAll('.pcard').forEach((c) => { c.onclick = () => openProblem(c.dataset.pk, c.dataset.pid); });
  box.querySelectorAll('[data-gen]').forEach((b) => { b.onclick = () => makeGenerated(b.dataset.gen); });
  box.querySelectorAll('[data-delpack]').forEach((b) => {
    b.onclick = async () => {
      const id = b.dataset.delpack;
      if (id === BU_FINAL.id) { // built in: hidden, not deleted — it can come back from the bottom of the page
        if (!(await confirmBox(T`เอาชุด ${BU_FINAL.name} ออกจากหน้าโจทย์?`, T`ความคืบหน้าและงานที่ทำไว้ยังอยู่ — เอากลับมาได้ทุกเมื่อจากปุ่มท้ายหน้านี้`, T`เอาออก`, true))) return;
        S.hiddenPacks = [...(S.hiddenPacks || []), id]; save(); renderLibrary();
        toast(T`เอา ${BU_FINAL.name} ออกแล้ว`, { label: T`เลิกทำ`, action: () => { S.hiddenPacks = S.hiddenPacks.filter((x) => x !== id); save(); renderLibrary(); } });
        return;
      }
      const pk = S.packs.find((x) => x.id === id);
      if (!pk || !(await confirmBox(T`เอาชุด ${pk.name} ออก?`, T`เอาออกจากโปรแกรมเท่านั้น ไฟล์ในเครื่องไม่ถูกลบ`, T`เอาออก`, true))) return;
      S.packs.splice(S.packs.indexOf(pk), 1); save(); renderLibrary();
    };
  });
  box.querySelectorAll('[data-delgen]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); S.gen = S.gen.filter((x) => x.id !== b.dataset.delgen); save(); renderLibrary(); }; });
  if ($('gen-clear')) $('gen-clear').onclick = async () => { if (await confirmBox(T`ล้างโจทย์ที่สร้างทั้งหมด?`, T`โจทย์ที่สร้างไว้ ${S.gen.length} ข้อจะหายไป`, T`ล้าง`, true)) { S.gen = []; save(); renderLibrary(); } };
}
function problemCard(pk, p, i) {
  const pr = progOf(p.id);
  return `<div class="pcard glass ${pr && pr.pass ? 'done' : ''}" style="--i:${i}" data-pk="${pk.id}" data-pid="${p.id}">
    <div class="no">${p.no ? T`ข้อที่ ${p.no}` : esc(T(p.short || ''))}</div><h4>${esc(p.title)}</h4>${p.no && p.short ? `<div class="sh">${esc(T(p.short))}</div>` : ''}
    <div class="chips">${topicChips(p.topics)}</div>
    <div class="acts"><button class="pill-btn primary" data-open="${pk.id}|${p.id}|problem">${icon('code')}<span>${T`ทำโจทย์`}</span></button>
      ${p.buggy && p.buggy.length ? `<button class="pill-btn" data-open="${pk.id}|${p.id}|buggy">${icon('bug')}<span>${T`หาจุดผิด`}</span></button>` : ''}
      ${(p.variants || []).map((v, k) => `<button class="pill-btn" data-open="${pk.id}|${p.id}|variant:${k}" title="${T`โค้ดเซลล์ถัดไปในไฟล์`}">${icon('code')}<span>${T`แบบที่ ${k + 2}`}</span></button>`).join('')}
      ${pk.id === 'generated' ? `<button class="icon-btn" data-delgen="${p.id}" title="${T`ลบโจทย์นี้`}">${icon('trash')}</button>` : ''}
      <span class="ed-fill"></span>${pr ? `<span class="prog-pill ${pr.pass ? '' : 'no'}">${pr.pass ? icon('check') + T`ผ่าน` : esc(pr.last || pr.best)}</span>` : ''}</div></div>`;
}
async function makeGenerated(key) {
  let p = generate(key === 'any' ? null : key);
  p = await finalize(p, runPython);
  S.gen.push(p);
  if (S.gen.length > 60) S.gen.shift();
  save();
  renderLibrary();
  openProblem('generated', p.id);
  toast(T`สร้างโจทย์ใหม่แล้ว: ${p.title}`);
}

/* ------------------------------------------------------------------ quiz */
let quiz = null, quizChecked = false;
function renderQuizTopics() {
  const box = $('quiz-topics');
  const all = [['all', 'ทุกหัวข้อ'], ...QUIZ_TOPICS.map((t) => [t, TOPIC_NAMES[t] || t])];
  box.innerHTML = all.map(([k, n]) => `<button class="chip ${S.quiz.topic === k ? 'on' : ''}" data-t="${k}">${esc(T(n))}</button>`).join('');
  box.querySelectorAll('[data-t]').forEach((b) => { b.onclick = () => { S.quiz.topic = b.dataset.t; save(); renderQuizTopics(); newQuiz(); }; });
}
function renderScore() {
  const q = S.quiz;
  $('quiz-score').innerHTML = `<span class="score-pill glass">${icon('check')}<b>${q.right}/${q.total}</b> ${T`ถูก`}</span><span class="score-pill glass"><span class="fire">🔥</span><b>${q.streak}</b> ${T`ติดกัน`} · ${T`ดีสุด`} <b>${q.best}</b></span>`;
}
function newQuiz() {
  quiz = makeQuiz(S.quiz.topic);
  quizChecked = false;
  const box = $('quiz');
  box.classList.remove('celebrate');
  box.innerHTML = `<div class="q-head"><span class="badge cool">${esc(T(TOPIC_NAMES[quiz.topic] || quiz.topic))}</span><h3>${esc(T(quiz.name))}</h3>
      <button class="pill-btn small" id="q-new">${icon('dice')}<span>${T`ข้อใหม่`}</span></button></div>
    <div class="q-code" id="q-code"></div>
    <div class="q-side"><b>${T`โปรแกรมนี้จะแสดงอะไรออกหน้าจอ?`}</b>
      <textarea id="q-ans" spellcheck="false" placeholder="${T`พิมพ์ผลลัพธ์ทีละบรรทัด…`}"></textarea>
      <div class="q-btns"><button class="pill-btn primary" id="q-check">${icon('check')}<span>${T`ตรวจคำทาย (Ctrl+Enter)`}</span></button>
        <button class="pill-btn" id="q-viz">${icon('anim')}<span>${T`ดูทีละขั้น`}</span></button>
        <button class="pill-btn" id="q-edit">${icon('code')}<span>${T`เปิดในช่องเขียนโค้ด`}</span></button></div>
      <p class="muted" style="font-size:12px">${T`ไม่ต้องสนช่องว่างท้ายบรรทัด · ทายผิดไม่เป็นไร — ดูทีละขั้นแล้วจะเข้าใจเลยว่าทำไม`}</p></div>
    <div class="q-res" id="q-res"></div>`;
  createViewer($('q-code'), quiz.code, 15);
  $('q-new').onclick = newQuiz;
  $('q-check').onclick = checkQuiz;
  $('q-ans').onkeydown = (e) => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); if (quizChecked) newQuiz(); else checkQuiz(); } };
  $('q-viz').onclick = () => quizToEditor(true);
  $('q-edit').onclick = () => quizToEditor(false);
  setTimeout(() => $('q-ans') && $('q-ans').focus(), 60);
}
async function checkQuiz() {
  if (!quiz || quizChecked) return;
  const guess = $('q-ans').value;
  const res = await runPython({ code: quiz.code, stdin: [], files: {}, trace: false });
  const actual = outText(res) + (res.error ? `${res.error.type}: ${res.error.msg}\n` : '');
  const norm = (s) => s.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
  const right = norm(guess) === norm(actual);
  quizChecked = true;
  const q = S.quiz;
  q.total++; if (right) { q.right++; q.streak++; q.best = Math.max(q.best, q.streak); } else q.streak = 0;
  save(); renderScore();
  $('q-res').innerHTML = `<div class="verdict ${right ? 'ok' : 'bad'}">${icon(right ? 'check' : 'x')}<span>${right ? T`ถูกต้อง!` : T`ยังไม่ถูก — ดูความต่างด้านล่าง แล้วกด "ดูทีละขั้น"`}</span></div>${right ? `<div class="dcol"><pre>${esc(actual)}</pre></div>` : diffHtml(guess, actual, { leftLabel: T`ที่คุณทาย`, rightLabel: T`ที่โปรแกรมแสดงจริง` })}
    <p class="muted" style="font-size:12px;margin-top:8px">${T`กด Ctrl+Enter อีกครั้งเพื่อทำข้อถัดไป`}</p>`;
  if (right) { $('quiz').classList.remove('celebrate'); void $('quiz').offsetWidth; $('quiz').classList.add('celebrate'); }
}
function quizToEditor(play) {
  let d = S.docs.find((x) => x.ref && x.ref.kind === 'quiz');
  if (!d) d = newDoc({ name: T`ทายผล`, code: quiz.code, ref: { kind: 'quiz', pack: '', pid: '' } });
  d.code = quiz.code; d.files = {};
  activate(d.id);
  showView('code');
  if (play) runTrace({ play: true, interactive: true });
}

/* -------------------------------------------------------------- shortcuts */
const KEYS = [
  ['รันโปรแกรม', 'F5'], ['รันแล้วดูการทำงานทีละขั้น', 'F6'], ['หยุดโปรแกรม', 'Shift+F5'], ['ตรวจคำตอบ', 'Ctrl+Enter'],
  ['ภาพทีละขั้น: ขั้นถัดไป', 'F10'], ['ภาพทีละขั้น: ย้อนกลับ', 'Shift+F10'], ['ภาพทีละขั้น: เล่น / หยุด', 'F7'], ['ภาพทีละขั้น: ไปต้น / ท้าย', 'Home / End'],
  ['บันทึกเป็นไฟล์ .py', 'Ctrl+S'], ['เปิดไฟล์ .py / .ipynb', 'Ctrl+O'], ['เอกสารใหม่', 'Ctrl+N'], ['ปิดแท็บ', 'Ctrl+W'], ['สลับแท็บ', 'Ctrl+Tab'],
  ['ซ่อน / แสดงโจทย์', 'Ctrl+B'], ['ซ่อน / แสดงแผงสรุปค่าด้านขวา', 'Ctrl+J'], ['เปิดคลังไฟล์ (แผงขวา)', 'Ctrl+Shift+E'], ['คลัง: เลือกหลายไฟล์', 'Ctrl+คลิก / Shift+คลิก / ลากคลุม'], ['คลัง: เลือกทั้งหมด / ลบ / เปลี่ยนชื่อ', 'Ctrl+A / Delete / F2'], ['คลัง: ย้อนกลับ / ทำซ้ำ', 'Ctrl+Z / Ctrl+Y'], ['ชี้ตัวแปรในโค้ด = ดูค่าทั้งหมดที่เคยเป็น', 'เมาส์'], ['ขยายช่องเขียนโค้ดเต็ม', 'Ctrl+Alt+B'], ['ตัวอักษรใหญ่ / เล็ก / ปกติ', 'Ctrl+= / Ctrl+- / Ctrl+0'], ['หน้าคีย์ลัด', 'F1'],
];
const EDKEYS = [
  ['คอมเมนต์ / ยกเลิกคอมเมนต์', 'Ctrl+/'], ['ย่อหน้า / ถอยย่อหน้า', 'Tab / Shift+Tab'], ['ย้อนกลับ / ทำซ้ำ', 'Ctrl+Z / Ctrl+Y'], ['ค้นหา / แทนที่', 'Ctrl+F / Ctrl+H'],
  ['ย้ายบรรทัดขึ้น / ลง', 'Alt+↑ / Alt+↓'], ['คัดลอกบรรทัดขึ้น / ลง', 'Shift+Alt+↑ / ↓'], ['ลบทั้งบรรทัด', 'Ctrl+Shift+K'], ['เลือกคำเดียวกันตัวถัดไป', 'Ctrl+D'],
  ['เคอร์เซอร์หลายตัว', 'Alt+คลิก'], ['เติมคำอัตโนมัติ', 'Ctrl+Space'], ['ไปบรรทัดที่…', 'Ctrl+G'], ['เลือกทั้งหมด', 'Ctrl+A'],
];
const kbds = (s) => s.split(' / ').map((g) => g.split('+').map((k) => `<kbd>${esc(T(k))}</kbd>`).join('')).join(' <span class="muted">/</span> ');
function renderKeys() {
  $('keys').innerHTML = `<div class="glass card appear"><h3>${icon('keyboard')}${T`ในโปรแกรม`}</h3><div class="keys">${KEYS.map(([a, k]) => `<div class="key-row"><span>${esc(T(a))}</span><span>${kbds(k)}</span></div>`).join('')}</div></div>
    <div class="glass card appear" style="--i:1"><h3>${icon('code')}${T`ในช่องเขียนโค้ด (เหมือน VS Code)`}</h3><div class="keys">${EDKEYS.map(([a, k]) => `<div class="key-row"><span>${esc(T(a))}</span><span>${kbds(k)}</span></div>`).join('')}</div></div>`;
}

/* ------------------------------------------------------------------ views */
let pageRail = null;
// Problems / Library page: two tabs, one name rail on the right edge
function setLibTab(t) {
  S.ui.libTab = t === 'files' ? 'files' : 'prob';
  document.querySelectorAll('#lib-tabs .tab').forEach((b) => b.classList.toggle('active', b.dataset.lt === S.ui.libTab));
  $('lib').classList.toggle('hidden', S.ui.libTab !== 'prob');
  $('lib-files').classList.toggle('hidden', S.ui.libTab !== 'files');
  $('lib-sub').textContent = S.ui.libTab === 'prob' ? T`เลือกโจทย์มาทำ · สร้างโจทย์ใหม่ · หรือเปิดไฟล์ .ipynb ของคุณเอง` : T`ไฟล์ .py ของคุณทั้งหมด — จัดเป็นโฟลเดอร์ได้ ลากไฟล์ไปวางในโฟลเดอร์ · คลิกขวาดูคำสั่งเพิ่ม`;
  $('view-library').scrollTop = 0;
  save();
  requestAnimationFrame(() => pageRail && pageRail.build());
}
function showView(v) {
  document.querySelectorAll('.view').forEach((x) => x.classList.toggle('active', x.id === 'view-' + v));
  document.querySelectorAll('.dock-btn[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
  if (v !== 'code') clearFlights();
  if (v === 'library') { renderLibrary(); refreshLibrary(); }
  requestAnimationFrame(() => pageRail && pageRail.build());
  if (v === 'quiz') { renderQuizTopics(); renderScore(); if (!quiz) newQuiz(); }
  if (v === 'keys') renderKeys();
  if (v === 'code' && ED) setTimeout(() => ED.view.requestMeasure(), 50);
  remember('prism.view', v);
}

/* -------------------------------------------------------------- splitters */
function applyLayout() {
  const r = document.documentElement.style;
  r.setProperty('--probW', S.ui.probW + 'px');
  r.setProperty('--vizW', Math.round(S.ui.vizW * 1000) / 10 + '%');
  r.setProperty('--conH', S.ui.conH + 'px');
}
function wireSplitters() {
  const ws = $('ws');
  $('vsplit').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = ws.getBoundingClientRect();
    document.body.classList.add('dragging-split');
    const mv = (ev) => { S.ui.vizW = Math.max(0.24, Math.min(0.62, (rect.right - ev.clientX) / rect.width)); applyLayout(); clearFlights(); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); document.body.classList.remove('dragging-split'); save(); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  });
  $('hsplit').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const col = $('ed-col').getBoundingClientRect();
    document.body.classList.add('dragging-hsplit');
    const mv = (ev) => { S.ui.conH = Math.max(80, Math.min(col.height - 160, col.bottom - ev.clientY)); applyLayout(); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); document.body.classList.remove('dragging-hsplit'); save(); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  });
  // problem pane width: drag its right edge
  const prob = $('prob');
  prob.addEventListener('pointermove', (e) => { const r = prob.getBoundingClientRect(); prob.style.cursor = r.right - e.clientX < 8 ? 'col-resize' : ''; });
  prob.addEventListener('pointerdown', (e) => {
    const r = prob.getBoundingClientRect();
    if (r.right - e.clientX >= 8) return;
    e.preventDefault();
    document.body.classList.add('dragging-split');
    const mv = (ev) => { S.ui.probW = Math.max(240, Math.min(560, ev.clientX - r.left)); applyLayout(); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); document.body.classList.remove('dragging-split'); save(); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  });
}

/* -------------------------------------------------------------------- keys */
function onKey(e) {
  const modal = !$('modal').classList.contains('hidden');
  const k = e.key, ctrl = e.ctrlKey || e.metaKey;
  const inCode = $('view-code').classList.contains('active');
  if (k === 'F1') { e.preventDefault(); showView('keys'); return; }
  if (modal) return;
  if (k === 'F5' && e.shiftKey) { e.preventDefault(); stopAll(); return; }
  if (k === 'F5') { e.preventDefault(); if (!inCode) showView('code'); runNormal(); return; }
  if (k === 'F6') { e.preventDefault(); if (!inCode) showView('code'); runVisual(); return; }
  if (k === 'F7') { e.preventDefault(); viz.toggle(); return; }
  if (k === 'F10') { e.preventDefault(); viz.pause(); if (e.shiftKey) viz.prev(); else viz.next(); return; }
  if (ctrl && k === 'Enter' && inCode) { e.preventDefault(); e.stopPropagation(); runCheck(); return; }
  if (ctrl && !e.shiftKey && k.toLowerCase() === 's') { e.preventDefault(); saveDoc(); return; }
  if (ctrl && k.toLowerCase() === 'o') { e.preventDefault(); openFromDisk(); return; }
  if (ctrl && k.toLowerCase() === 'n') { e.preventDefault(); showView('code'); $('tab-new').click(); return; }
  if (ctrl && k.toLowerCase() === 'w') { e.preventDefault(); if (S.active) closeDoc(S.active); return; }
  if (ctrl && k === 'Tab') { e.preventDefault(); const i = S.open.indexOf(S.active), n = S.open.length; if (n > 1) activate(S.open[(i + (e.shiftKey ? n - 1 : 1)) % n]); return; }
  if (libKey(e)) return; // library on screen: Ctrl+Z / Ctrl+Y / Ctrl+A / Delete / F2 / Esc (not while typing in the editor or a box)
  if (ctrl && e.shiftKey && k.toLowerCase() === 'e') {
    e.preventDefault();
    if (!inCode) showView('code');
    if (S.ui.noright) setRight(true);
    setRTab('lib');
    setTimeout(() => { const i = document.querySelector('#r-lib .lb-search input'); if (i) i.focus(); }, 60);
    return;
  }
  if (ctrl && !e.altKey && k.toLowerCase() === 'j') { e.preventDefault(); setRight(S.ui.noright); return; }
  if (ctrl && e.altKey && k.toLowerCase() === 'b') { e.preventDefault(); setFocusMode(!S.ui.focus); return; }
  if (ctrl && k.toLowerCase() === 'b') { e.preventDefault(); if (S.ui.focus) setFocusMode(false); setProb(S.ui.noprob); return; }
  if (ctrl && (k === '=' || k === '+')) { e.preventDefault(); setFont(S.ui.fontSize + 1); return; }
  if (ctrl && k === '-') { e.preventDefault(); setFont(S.ui.fontSize - 1); return; }
  if (ctrl && k === '0') { e.preventDefault(); setFont(15); return; }
  const typing = e.target.closest && e.target.closest('input, textarea, select, .cm-editor');
  if (typing) return;
  if (inCode && viz.count) {
    if (k === 'ArrowRight') { e.preventDefault(); viz.pause(); viz.next(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); viz.pause(); viz.prev(); }
    else if (k === ' ') { e.preventDefault(); viz.toggle(); }
    else if (k === 'Home') { e.preventDefault(); viz.first(); }
    else if (k === 'End') { e.preventDefault(); viz.last(); }
  }
  if (k === 'Escape') hideCtx();
}

/* -------------------------------------------------------------------- boot */
async function boot() {
  api.invoke('app:lang', lang); // native file dialogs follow the page language
  translateDom(document.body);
  hydrateIcons();
  setLook(savedLook());
  setTheme(savedTheme());
  startBackground($('bg'));
  $('win-min').onclick = () => api.invoke('win:min');
  $('win-max').onclick = () => api.invoke('win:max');
  $('win-close').onclick = () => { saveNow(); if (native) api.invoke('win:close'); else window.close(); };
  $('btn-info').onclick = showInfo;
  const themeIcon = () => { $('btn-theme').firstElementChild.innerHTML = icon(theme.dark ? 'day' : 'moon'); };
  // appearance menu under the moon/sun: theme (light / dark) + style (glass / classic) — suite shell, same as Prism Size
  {
    const pop = $('theme-pop'), tbtn = $('btn-theme'), isOpen = () => !pop.classList.contains('hidden');
    const sync = () => {
      pop.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', (b.dataset.mode === 'dark') === theme.dark));
      pop.querySelectorAll('[data-look]').forEach((b) => b.classList.toggle('on', (b.dataset.look === 'classic') === theme.classic));
    };
    const place = () => { const r = tbtn.getBoundingClientRect(), w = pop.offsetWidth; pop.style.left = Math.max(8, Math.min(r.right - w + 8, innerWidth - w - 8)) + 'px'; pop.style.top = r.bottom + 12 + 'px'; };
    const close = () => { pop.classList.add('hidden'); tbtn.classList.remove('open'); };
    tbtn.onclick = () => { if (isOpen()) { close(); return; } hideCtx(); sync(); pop.classList.remove('hidden'); tbtn.classList.add('open'); place(); };
    pop.querySelectorAll('[data-mode]').forEach((b) => { b.onclick = () => { const d = b.dataset.mode === 'dark'; setTheme(d); themeIcon(); sync(); }; });
    pop.querySelectorAll('[data-look]').forEach((b) => { b.onclick = () => { setLook(b.dataset.look === 'classic'); sync(); }; });
    addEventListener('pointerdown', (e) => { if (isOpen() && !pop.contains(e.target) && !tbtn.contains(e.target)) close(); }, true);
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) { e.stopPropagation(); close(); } }, true);
    addEventListener('resize', () => { if (isOpen()) place(); }); // snap / maximise: follow the button
  }
  themeIcon();
  const ls = $('lang-switch');
  ls.dataset.lang = lang;
  ls.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('on', b.dataset.lang === lang);
    b.onclick = () => {
      if (b.dataset.lang === lang) return;
      ls.dataset.lang = b.dataset.lang;
      remember('prism.lang', b.dataset.lang);
      saveNow();
      setTimeout(() => { if (new URLSearchParams(location.search).has('lang')) location.search = ''; else location.reload(); }, 260);
    };
  });
  addEventListener('pointermove', (e) => {
    const g = e.target.closest && e.target.closest('.glass'); if (!g) return;
    const r = g.getBoundingClientRect();
    g.style.setProperty('--mx', e.clientX - r.left + 'px'); g.style.setProperty('--my', e.clientY - r.top + 'px');
  });
  addEventListener('pointerdown', (e) => { if (!e.target.closest('#ctx')) hideCtx(); }, true);
  addEventListener('contextmenu', (e) => { if (!e.target.closest('input, textarea, .cm-editor, .con-out, .prob-body')) e.preventDefault(); });
  addEventListener('keydown', onKey, true);

  // python status
  const ps = $('py-status');
  bus.on('py:ready', (m) => { ps.className = 'py-status ready'; ps.lastElementChild.textContent = `Python ${m.version}`; ps.title = T`Python พร้อมแล้ว (โหลด ${m.ms} ms) — ทำงานในเครื่อง ไม่ใช้เน็ต`; api.invoke('app:log', `python ready ${m.version} in ${m.ms} ms`); });
  bus.on('py:fail', (msg) => { ps.className = 'py-status bad'; ps.lastElementChild.textContent = T`Python โหลดไม่สำเร็จ`; ps.title = msg; api.invoke('app:log', 'python failed: ' + msg); });
  if (pyInfo.version) bus.emit('py:ready', { version: pyInfo.version, ms: pyInfo.bootMs });

  // editor + stage
  ED = createEditor($('editor'), { onChange: onCode, fontSize: S.ui.fontSize });
  $('font-size').textContent = S.ui.fontSize;
  // Ctrl+wheel never zooms the whole window (that would shrink the value labels too); over the editor it zooms the code only
  addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    if (e.target.closest && e.target.closest('#ed-col')) setFont(S.ui.fontSize + (e.deltaY < 0 ? 1 : -1));
  }, { passive: false, capture: true });
  viz = new Viz($('vz'), { editor: ED, narrEl: $('vz-narr'), onConsole: (out, atEnd) => setConsole(out, { tail: atEnd }), onStep: updateVizBar });
  viz.setSpeed(S.ui.speed);
  $('vz-speed').value = String(S.ui.speed);
  $('vz-speed').onchange = () => { S.ui.speed = +$('vz-speed').value; viz.setSpeed(S.ui.speed); save(); };
  $('vz-play').onclick = () => viz.toggle();
  $('vz-next').onclick = () => { viz.pause(); viz.next(); };
  $('vz-prev').onclick = () => { viz.pause(); viz.prev(); };
  $('vz-first').onclick = () => { viz.pause(); viz.first(); };
  $('vz-last').onclick = () => { viz.pause(); viz.last(); };
  $('vz-slider').oninput = () => { const v = +$('vz-slider').value; viz.pause(); viz.show(v, false); };
  $('vz').addEventListener('scroll', () => clearFlights(), true);
  document.querySelectorAll('#r-tabs .tab').forEach((b) => { b.onclick = () => setRTab(b.dataset.r); });

  // library (คลัง): right tab of the code page + "Library" tab of the Problems / Library page
  initLibrary({ S, save, openDoc, removeDoc, newLibDoc, openFromDisk, saveTextAs, activeId: () => S.active, docChanged: () => { renderTabs(); renderCrumbs(); } });
  for (const d of S.docs) if (d.path && !d.ref) d.lib = true; // .py files opened before the library existed
  mountLibrary('panel', $('r-lib'), { compact: true });
  mountLibrary('page', $('lib-files'));
  const railEl = document.createElement('div'); railEl.id = 'page-rail'; document.body.appendChild(railEl);
  pageRail = createRail($('view-library'), railEl, { isOn: () => $('view-library').classList.contains('active') });
  setPageRail(pageRail);
  document.querySelectorAll('#lib-tabs .tab').forEach((b) => { b.onclick = () => setLibTab(b.dataset.lt); });
  setLibTab(S.ui.libTab);

  // toolbar
  $('btn-run').onclick = runNormal;
  $('btn-viz').onclick = runVisual;
  $('btn-check').onclick = runCheck;
  $('btn-stop').onclick = stopAll;
  $('btn-predict').onclick = () => { S.ui.predict = !S.ui.predict; $('btn-predict').classList.toggle('on', S.ui.predict); save(); toast(S.ui.predict ? T`เปิดโหมดทายก่อนรัน — กด F5 แล้วทายผลก่อนเห็นของจริง` : T`ปิดโหมดทายก่อนรัน`); };
  $('btn-predict').classList.toggle('on', S.ui.predict);
  $('btn-open').onclick = openFromDisk; $('dock-open').onclick = openFromDisk; $('lib-open').onclick = openFromDisk;
  $('btn-save').onclick = saveDoc;
  $('btn-font-').onclick = () => setFont(S.ui.fontSize - 1);
  $('btn-font+').onclick = () => setFont(S.ui.fontSize + 1);
  $('btn-wide').onclick = () => setFocusMode(!S.ui.focus);
  $('btn-right').onclick = () => setRight(S.ui.noright);
  $('btn-spot').onclick = () => { S.ui.spot = !S.ui.spot; $('btn-spot').classList.toggle('on', S.ui.spot); viz.setSpot(S.ui.spot); save(); };
  $('btn-spot').classList.toggle('on', S.ui.spot); viz.setSpot(S.ui.spot);
  setRight(!S.ui.noright);
  $('con-clear').onclick = () => setConsole([]);
  $('prob-hide').onclick = () => setProb(false);
  $('prob-show').onclick = () => { setFocusMode(false); setProb(true); };
  document.querySelectorAll('.dock-btn[data-view]').forEach((b) => { b.onclick = () => showView(b.dataset.view); });
  applyLayout(); wireSplitters();
  $('ws').classList.toggle('noprob', S.ui.noprob);
  $('ws').classList.toggle('focus', S.ui.focus);
  $('prob-show').classList.toggle('hidden', !S.ui.noprob || S.ui.focus);

  // drag & drop (Tauri gives real paths; a browser gives file contents)
  document.body.insertAdjacentHTML('beforeend', `<div class="drop-zone-all">${T`วางไฟล์ .py / .ipynb / .txt ที่นี่`}</div>`);
  api.on('code:drop', async ({ paths }) => { for (const p of paths || []) await openPath(p); });
  api.on('code:dragover', (on) => document.body.classList.toggle('drag-over', !!on));
  if (!native) {
    addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('drag-over'); });
    addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('drag-over'); });
    addEventListener('drop', async (e) => { e.preventDefault(); document.body.classList.remove('drag-over'); for (const f of e.dataTransfer.files) await openText(f.name, await f.text(), null, {}); });
  }

  // documents: first start opens BU Final problem 1
  S.open = S.open.filter((id) => S.docs.some((d) => d.id === id));
  if (!S.docs.length) {
    const p = BU_FINAL.problems[0];
    newDoc({ name: T`ข้อ ${p.no}`, code: p.starter, files: p.files, ref: { pack: BU_FINAL.id, pid: p.id, kind: 'problem' } });
  }
  if (!S.open.length) S.open.push(S.docs[0].id);
  activate(S.open.includes(S.active) ? S.active : S.open[0]);
  setRTab(['check', 'files', 'lib'].includes(S.ui.rtab) ? S.ui.rtab : 'viz');
  try { const v = localStorage.getItem('prism.view'); if (v && $('view-' + v)) showView(v); } catch { /* */ }
  updateVizBar();
  if (!native) window.__pc = { viz, ED, S, runTrace, runCheck, openProblem }; // browser dev preview only
  api.invoke('app:ready');

  // files given on the command line ("Open with")
  const args = (await api.invoke('app:args')) || [];
  for (const a of Array.isArray(args) ? args : []) await openPath(a);
  api.on('code:open', async ({ paths }) => { for (const p of paths || []) await openPath(p); });

  // self-test hook: PRISM_ACT=en,dark,info,view:library,open:bu1,buggy:bu1,viz,run,check,quiz,gen:t3,wait:<ms>,step:<n>,quit …
  const acts = String((await api.invoke('about:info')).test || (!native && new URLSearchParams(location.search).get('act')) || '').split(',').filter(Boolean);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const a of acts) {
    const [cmd, arg] = [a.split(':')[0], a.split(':').slice(1).join(':')];
    api.invoke('app:log', 'test act ' + a);
    if (cmd === 'en' || cmd === 'th') { if (lang !== cmd) { remember('prism.lang', cmd); location.reload(); return; } }
    else if (cmd === 'dark' || cmd === 'light') { setTheme(cmd === 'dark'); themeIcon(); }
    else if (cmd === 'themepop' || cmd === 'classic' || cmd === 'glass') { // full press sequence, so the close-on-outside-press listener runs too
      const press = (el) => { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); el.click(); };
      if (cmd === 'themepop') press($('btn-theme'));
      else if (!$('theme-pop').classList.contains('hidden')) press(document.querySelector(`#theme-pop [data-look=${cmd}]`));
      else setLook(cmd === 'classic');
    }
    else if (cmd === 'info') showInfo();
    else if (cmd === 'updfake') window.__prismUpdFake = true;
    else if (cmd === 'view') showView(arg);
    else if (cmd === 'open') openProblem(BU_FINAL.id, arg);
    else if (cmd === 'buggy') openProblem(BU_FINAL.id, arg, 'buggy:0');
    else if (cmd === 'openpk') { const pk = S.packs[0]; if (pk) openProblem(pk.id, pk.problems[+arg || 0].id); }
    else if (cmd === 'code') { ED.replaceAll(decodeURIComponent(arg)); }
    else if (cmd === 'sol') { const p = docProblem(activeDoc()); if (p) ED.replaceAll(p.solution); }
    else if (cmd === 'run') { await (await import('./runner.js')).pyReady(); runTrace({ stdin: arg ? arg.split('|') : [], interactive: false }); }
    else if (cmd === 'viz') { await (await import('./runner.js')).pyReady(); runTrace({ stdin: arg ? arg.split('|') : [], play: true, interactive: false }); }
    else if (cmd === 'step') { for (let i = 0; i < +arg; i++) { viz.pause(); await viz.next(); await wait(120); } }
    else if (cmd === 'goto') { viz.pause(); viz.show(+arg, false); }
    else if (cmd === 'check') { await (await import('./runner.js')).pyReady(); runCheck(); }
    else if (cmd === 'tab') setRTab(arg);
    else if (cmd === 'libtab') { showView('library'); setLibTab(arg); }
    else if (cmd === 'mkfolder') { S.folders.push({ id: 'f' + uid(), name: decodeURIComponent(arg), parent: null, open: true }); save(); refreshLibrary(); }
    else if (cmd === 'mkfile') { const [nm, fo] = arg.split('@'); const f = S.folders.find((x) => x.name === decodeURIComponent(fo || '')); newLibDoc(decodeURIComponent(nm), f ? f.id : null, `# ${decodeURIComponent(nm)}\nprint("hi")\n`); save(); refreshLibrary(); libBadge(); }
    else if (cmd === 'right') setRight(arg !== 'off');
    else if (cmd === 'libdel') { // remove test leftovers by exact name (folders + library files); the exe shares the user's real data
      const nm = decodeURIComponent(arg);
      S.docs = S.docs.filter((d) => !(d.lib && !d.ref && !d.path && d.name === nm));
      S.open = S.open.filter((id) => S.docs.some((d) => d.id === id));
      S.folders = S.folders.filter((f) => f.name !== nm);
      save(); refreshLibrary(); libBadge();
    }
    else if (cmd === 'quiz') showView('quiz');
    else if (cmd === 'gen') { await (await import('./runner.js')).pyReady(); await makeGenerated(arg || 'any'); }
    else if (cmd === 'openfile') await openPath(arg);
    else if (cmd === 'pause') viz.pause();
    else if (cmd === 'wait') await wait(+arg || 500);
    else if (cmd === 'quit') { saveNow(); api.invoke('win:close'); }
  }
}
boot();

/* >>> prism-update-nudge (tools/brand/apply-web.js) */
{
  // Checks GitHub quietly a few seconds after start (and every 6 h). New version → dot on Info + a chip that slides out
  // once per version; clicking either opens Info already showing "Update now".
  const btn = document.getElementById('btn-info'), SEEN = 'prism.updSeen';
  let found = null;
  const chipOut = (r) => {
    let seen = null; try { seen = localStorage.getItem(SEEN); } catch {}
    if (seen === r.latest || document.querySelector('.upd-chip')) return;
    const chip = document.createElement('button');
    chip.className = 'upd-chip';
    chip.innerHTML = `<i></i><span>${T`มีเวอร์ชันใหม่ v${esc(r.latest)}`}</span><u>${T`(ตอนนี้ v${esc(r.current)})`}</u><b>${T`อัปเดต`}</b>`;
    document.body.appendChild(chip);
    const place = () => { const b = btn.getBoundingClientRect(); chip.style.top = `${b.bottom + 10}px`; chip.style.right = `${Math.max(8, innerWidth - b.right - 6)}px`; };
    place(); addEventListener('resize', place);
    requestAnimationFrame(() => requestAnimationFrame(() => chip.classList.add('show')));
    const hide = () => { chip.classList.remove('show'); removeEventListener('resize', place); setTimeout(() => chip.remove(), 450); };
    chip.onclick = () => { hide(); btn.click(); };
    setTimeout(hide, 10000);
  };
  const check = async () => {
    let r; try { r = window.__prismUpdFake ? { ok: true, hasUpdate: true, latest: '9.9.9', current: '1.0.0' } : await api.invoke('update:check'); } catch { return; } // __prismUpdFake = test hook (PRISM_ACT updfake)
    if (!r || !r.ok || !r.hasUpdate) return;
    const fresh = !found || found.latest !== r.latest;
    found = r;
    btn.classList.add('has-update');
    if (fresh) btn.classList.remove('seen');
    btn.title = T`มีเวอร์ชันใหม่ v${r.latest} — กดเพื่ออัปเดต`;
    chipOut(r);
  };
  setTimeout(check, 4000);
  setInterval(check, 6 * 3600e3);
  btn.addEventListener('click', () => {
    if (!found) return;
    try { localStorage.setItem(SEEN, found.latest); } catch {}
    btn.classList.add('seen');
    document.querySelector('.upd-chip')?.classList.remove('show');
    const t0 = performance.now();
    const go = () => { const c = document.getElementById('about-check'); if (c && !c.disabled && c.isConnected) c.click(); else if (performance.now() - t0 < 2500) requestAnimationFrame(go); };
    requestAnimationFrame(go);
  });
}
/* <<< prism-update-nudge */
