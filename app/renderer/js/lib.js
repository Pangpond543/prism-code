// Library (คลัง): the learner's own .py files — every .py opened / dropped from the PC and every document written here
// that is not a problem — kept in folders. Two views of the same data: the "Library" tab of the Problems / Library page
// and the "Library" tab on the right of the code page. Rows are grabbed like Prism Cam layers: the card lifts from its
// row, gathers under the mouse, a pill says what a drop will do (into a folder / out to the top / open in the editor),
// and on release it flies into the target (or back home on Esc).
// v1.4: select many (Ctrl+click, Shift+click, rubber-band drag on empty space, Ctrl+A), move / delete / save them
// together, Ctrl+Z / Ctrl+Y for every library action, and faint guide lines under each open folder.
import { api, native, T, esc, $, toast, confirmBox, promptBox, ctxMenu } from './core.js';
import { icon } from './icons.js';
import { createRail } from './rail.js';

let C = null; // app context: S, save, openDoc, removeDoc, newLibDoc, openFromDisk, saveTextAs, activeId, docChanged
const hosts = new Map(); // key → { el, list, rail, compact, q }

export const inLib = (d) => !!d && !d.ref && !!(d.lib || d.path || (d.code || '').trim());
const folders = () => (C.S.folders ||= []);
const fById = (id) => (id ? folders().find((f) => f.id === id) || null : null);
const dById = (id) => C.S.docs.find((d) => d.id === id) || null;
const libDocs = () => C.S.docs.filter(inLib);
const kids = (fid) => folders().filter((f) => (fById(f.parent) ? f.parent : null) === fid);
const filesIn = (fid) => libDocs().filter((d) => (fById(d.folder) ? d.folder : null) === fid); // a lost folder → top level
const cmp = (a, b) => a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' });
const countDeep = (fid) => filesIn(fid).length + kids(fid).reduce((n, f) => n + countDeep(f.id), 0);
const isUnder = (fid, anc) => { for (let f = fById(fid), k = 0; f && k < 50; f = fById(f.parent), k++) if (f.id === anc) return true; return false; };
const pathOf = (fid) => { const out = []; for (let f = fById(fid), k = 0; f && k < 50; f = fById(f.parent), k++) out.unshift(f.name); return out; };
const lines = (d) => (d.code ? d.code.replace(/\n+$/, '').split('\n').length : 0);
const initial = (n) => { const c = (n || '?').trim().charAt(0).toUpperCase(); return /\d/.test(c) ? '#' : c || '?'; };
const uid = () => 'f' + Math.random().toString(36).slice(2, 9);
const badName = (n) => !n || !/^[^\\/:*?"<>|]+$/.test(n);

/* ------------------------------------------------------------- selection */
// keys: "d:<docId>" (file) / "f:<folderId>" (folder). One selection shared by both views.
let sel = new Set(), anchor = null;
const keyOf = (el) => (el.dataset.did ? 'd:' + el.dataset.did : 'f:' + el.dataset.fid);
const parse = (k) => ({ kind: k[0] === 'd' ? 'file' : 'folder', id: k.slice(2) });
const exists = (i) => (i.kind === 'file' ? !!dById(i.id) : !!fById(i.id));
const parentOf = (i) => { const p = i.kind === 'file' ? (dById(i.id) || {}).folder : (fById(i.id) || {}).parent; return fById(p) ? p : null; };
const nameOf = (i) => (i.kind === 'file' ? (dById(i.id) || {}).name : (fById(i.id) || {}).name) || '';
function setSel(set, anc) {
  sel = set;
  if (anc !== undefined) anchor = anc;
  document.querySelectorAll('.lb-row').forEach((r) => r.classList.toggle('sel', sel.has(keyOf(r))));
}
// what a drag / save / move acts on: the selected things, minus anything that sits inside a selected folder
function normalize(keys) {
  const items = keys.map(parse).filter(exists);
  const selF = new Set(items.filter((i) => i.kind === 'folder').map((i) => i.id));
  return items.filter((i) => {
    for (let f = fById(parentOf(i)), k = 0; f && k < 50; f = fById(f.parent), k++) if (selF.has(f.id)) return false;
    return true;
  });
}

export function initLibrary(ctx) {
  C = ctx;
  addEventListener('click', (e) => { if (Date.now() < noClickUntil) { e.stopPropagation(); e.preventDefault(); } }, true);
}

/* ------------------------------------------------------------------ views */
export function mountLibrary(key, el, { compact = false } = {}) {
  el.innerHTML = `<div class="lb-tools">
      <label class="lb-search field">${icon('search')}<input spellcheck="false" placeholder="${T`ค้นหาชื่อไฟล์ หรือคำในโค้ด…`}"><button class="lb-qx hidden" title="${T`ล้างคำค้น`}">${icon('x')}</button></label>
      ${compact
        ? `<button class="icon-btn" data-lb="folder" title="${T`โฟลเดอร์ใหม่`}">${icon('newfolder')}</button><button class="icon-btn" data-lb="new" title="${T`ไฟล์ .py ใหม่`}">${icon('plus')}</button><button class="icon-btn" data-lb="open" title="${T`เปิดไฟล์ .py จากเครื่อง`}">${icon('open')}</button>`
        : `<button class="pill-btn small" data-lb="folder">${icon('newfolder')}<span>${T`โฟลเดอร์ใหม่`}</span></button><button class="pill-btn small" data-lb="new">${icon('plus')}<span>${T`ไฟล์ .py ใหม่`}</span></button><button class="pill-btn small" data-lb="save">${icon('download')}<span>${T`เก็บทั้งคลังลงเครื่อง`}</span></button>`}
    </div>
    <div class="lb-wrap"><div class="lb-list" data-lbroot></div>${compact ? '<div class="lb-rail"></div>' : ''}</div>`;
  const h = { el, list: el.querySelector('.lb-list'), compact, q: '', rail: null };
  if (compact) h.rail = createRail(h.list, el.querySelector('.lb-rail'), { isOn: () => el.offsetParent !== null });
  hosts.set(key, h);
  const inp = el.querySelector('.lb-search input'), qx = el.querySelector('.lb-qx');
  inp.oninput = () => { h.q = inp.value; qx.classList.toggle('hidden', !h.q); renderHost(h); };
  inp.onkeydown = (e) => {
    if (e.key === 'Escape' && inp.value) { e.stopPropagation(); inp.value = ''; inp.oninput(); }
    if (e.key === 'Enter') { const first = h.list.querySelector('.lb-file'); if (first) C.openDoc(first.dataset.did); }
  };
  qx.onclick = (e) => { e.preventDefault(); inp.value = ''; inp.oninput(); inp.focus(); };
  el.querySelectorAll('[data-lb]').forEach((b) => {
    b.onclick = () => ({ folder: () => newFolder(null), new: () => newFile(null), open: () => C.openFromDisk(), save: () => exportFolder(null) })[b.dataset.lb]();
  });
  // rows: click = select + open / fold · Ctrl+click = add / remove · Shift+click = range · drag empty space = rubber band
  h.list.addEventListener('click', (e) => {
    const row = e.target.closest('.lb-row');
    const mod = e.ctrlKey || e.metaKey || e.shiftKey;
    if (!row) { if (!mod) setSel(new Set()); return; }
    const k = keyOf(row);
    if (e.ctrlKey || e.metaKey) { const n = new Set(sel); if (n.has(k)) n.delete(k); else n.add(k); setSel(n, k); return; }
    if (e.shiftKey) {
      const keys = [...h.list.querySelectorAll('.lb-row')].map(keyOf), a = keys.indexOf(anchor), b = keys.indexOf(k);
      if (a < 0) { setSel(new Set([k]), k); return; }
      setSel(new Set(keys.slice(Math.min(a, b), Math.max(a, b) + 1)), anchor);
      return;
    }
    setSel(new Set([k]), k);
    if (row.classList.contains('lb-folder')) toggleFolder(row.dataset.fid); else C.openDoc(row.dataset.did);
  });
  h.list.addEventListener('dblclick', (e) => { if (e.ctrlKey || e.shiftKey) return; const d = e.target.closest('.lb-file'); if (d) renameDoc(d.dataset.did); else { const f = e.target.closest('.lb-folder'); if (f) renameFolder(f.dataset.fid); } });
  h.list.addEventListener('contextmenu', (e) => { e.preventDefault(); rowMenu(e); });
  h.list.addEventListener('pointerdown', (e) => { const row = e.target.closest('.lb-row'); if (row) press(e, row); else marquee(e, h); });
  renderHost(h);
  return h;
}
let rq = 0;
export function refreshLibrary() { cancelAnimationFrame(rq); rq = requestAnimationFrame(() => { for (const h of hosts.values()) renderHost(h); }); }
export const libCount = () => (C ? libDocs().length : 0);
const visible = (h) => h.el.offsetParent !== null && !!(h.el.closest('.view') || {}).classList?.contains('active');

function hl(name, q) {
  if (!q) return esc(name);
  const i = name.toLowerCase().indexOf(q);
  return i < 0 ? esc(name) : esc(name.slice(0, i)) + `<mark>${esc(name.slice(i, i + q.length))}</mark>` + esc(name.slice(i + q.length));
}
// faint vertical lines, one per open folder above this row: they run down the folder's chevron and stop where its contents end
const guides = (depth) => Array.from({ length: depth }, (_, k) => `<i class="lb-g" style="left:${15 + k * 18}px"></i>`).join('');
function fileRow(d, depth, { q = '', where = false, mark = '' } = {}) {
  const open = C.S.open.includes(d.id), on = d.id === C.activeId();
  const n = lines(d);
  let snip = '';
  if (q && !d.name.toLowerCase().includes(q)) { // matched inside the code: show that line
    const ln = (d.code || '').split('\n').find((l) => l.toLowerCase().includes(q)) || '';
    snip = `<em class="lb-snip">${hl(ln.trim().slice(0, 60), q)}</em>`;
  }
  return `<div class="lb-row lb-file ${on ? 'on' : ''} ${open ? 'open' : ''} ${sel.has('d:' + d.id) ? 'sel' : ''}" data-did="${d.id}" style="--d:${depth}" ${mark ? `data-mark="${esc(mark)}" data-mark-sub="${T`ไฟล์ที่ขึ้นต้นด้วย ${mark}`}"` : ''} title="${esc(d.path || d.name)}">${guides(depth)}
    <span class="lb-py">py</span><span class="lb-nm">${hl(d.name, q)}</span>${snip}${where && fById(d.folder) ? `<em class="lb-where">${icon('folder')}${esc(pathOf(d.folder).join(' / '))}</em>` : ''}
    <span class="lb-fill"></span>${d.dirty && d.path ? `<i class="lb-dot" title="${T`ยังไม่ได้บันทึกลงเครื่อง`}"></i>` : ''}<small>${n} ${T`บรรทัด`}</small></div>`;
}
function folderRow(f, depth) {
  const n = countDeep(f.id), open = f.open !== false;
  return `<div class="lb-row lb-folder ${open ? 'open' : ''} ${sel.has('f:' + f.id) ? 'sel' : ''}" data-fid="${f.id}" style="--d:${depth}" data-mark="${esc(f.name)}" data-mark-sub="${T`โฟลเดอร์ · ${n} ไฟล์`}">${guides(depth)}
    <span class="lb-chev">${icon('chev')}</span><span class="lb-fic">${icon('folder')}</span><span class="lb-nm">${esc(f.name)}</span><span class="lb-fill"></span><small class="lb-n">${n}</small></div>`;
}
function renderHost(h) {
  if (!C) return;
  for (const k of [...sel]) if (!exists(parse(k))) sel.delete(k); // things deleted elsewhere
  const q = h.q.trim().toLowerCase();
  let html = '';
  if (q) {
    const hits = libDocs().filter((d) => d.name.toLowerCase().includes(q) || (d.code || '').toLowerCase().includes(q)).sort(cmp);
    html = hits.length ? `<div class="lb-found">${T`พบ ${hits.length} ไฟล์`}</div>` + hits.map((d) => fileRow(d, 0, { q, where: true })).join('')
      : `<div class="lb-empty">${icon('search')}<b>${T`ไม่พบไฟล์ที่ตรงกับ “${esc(h.q)}”`}</b></div>`;
  } else {
    const out = [];
    const walk = (fid, depth) => {
      for (const f of kids(fid).sort(cmp)) { out.push(folderRow(f, depth)); if (f.open !== false) walk(f.id, depth + 1); }
      let last = '';
      for (const d of filesIn(fid).sort(cmp)) {
        const L = initial(d.name);
        out.push(fileRow(d, depth, { mark: depth === 0 && L !== last ? L : '' }));
        last = L;
      }
    };
    walk(null, 0);
    html = out.length ? out.join('') : `<div class="lb-empty">${icon('folder')}<b>${T`คลังยังว่าง`}</b><span>${T`เปิดไฟล์ .py หรือลากมาวาง แล้วไฟล์จะมาอยู่ที่นี่ — งานที่เขียนเองในโปรแกรมก็อยู่ที่นี่ด้วย`}</span></div>`;
  }
  h.list.innerHTML = html + '<div class="lb-tail"></div>'; // empty space at the end = where a rubber band can start
  if (h.rail) requestAnimationFrame(() => h.rail.build());
  if (pageRail) requestAnimationFrame(() => pageRail.build());
}
let pageRail = null;
export function setPageRail(r) { pageRail = r; }

/* ------------------------------------------------------------------- undo */
// Every library change goes through record(): it diffs folders + the files it touched, so Ctrl+Z / Ctrl+Y can put
// things back (including a deleted file, which keeps its code). Opening / editing a file is not recorded.
const undoS = [], redoS = [];
const snapF = () => folders().map((f) => ({ ...f }));
const metaOf = (d) => ({ name: d.name, folder: d.folder || null, lib: !!d.lib });
const sameF = (a, b) => JSON.stringify(a.map((f) => [f.id, f.name, f.parent || null])) === JSON.stringify(b.map((f) => [f.id, f.name, f.parent || null]));
function record(label, fn) {
  const f0 = snapF(), before = new Map(C.S.docs.map((d) => [d, metaOf(d)]));
  const out = fn();
  const f1 = snapF(), changes = [];
  for (const d of C.S.docs) {
    const b = before.get(d), a = metaOf(d);
    if (!b) { if (inLib(d)) changes.push({ d, before: null, after: a }); } // a blank tab opened by removeDoc is not ours
    else if (b.name !== a.name || b.folder !== a.folder || b.lib !== a.lib) changes.push({ d, before: b, after: a });
  }
  for (const [d, b] of before) if (!C.S.docs.includes(d)) changes.push({ d, before: b, after: null });
  if (changes.length || !sameF(f0, f1)) { undoS.push({ label, f0, f1, changes }); if (undoS.length > 100) undoS.shift(); redoS.length = 0; }
  return out;
}
function applyEntry(e, undo) {
  const open = new Map(folders().map((f) => [f.id, f.open]));
  C.S.folders = (undo ? e.f0 : e.f1).map((f) => ({ ...f, open: open.has(f.id) ? open.get(f.id) : f.open })); // fold state is not undone
  for (const c of e.changes) {
    const t = undo ? c.before : c.after;
    if (!t) { if (C.S.docs.includes(c.d)) C.removeDoc(c.d.id); } else { if (!C.S.docs.includes(c.d)) C.S.docs.push(c.d); Object.assign(c.d, t); }
  }
  C.save(); C.docChanged(); refreshLibrary();
}
export function undo() {
  const e = undoS.pop();
  if (!e) { toast(T`ไม่มีอะไรให้ย้อนกลับในคลัง`); return false; }
  applyEntry(e, true); redoS.push(e);
  toast(T`ย้อนกลับแล้ว: ${e.label}`, { label: T`ทำซ้ำ`, action: redo });
  return true;
}
export function redo() {
  const e = redoS.pop();
  if (!e) { toast(T`ไม่มีอะไรให้ทำซ้ำ`); return false; }
  applyEntry(e, false); undoS.push(e);
  toast(T`ทำซ้ำแล้ว: ${e.label}`);
  return true;
}

/* ---------------------------------------------------------------- actions */
function toggleFolder(fid) { const f = fById(fid); if (!f) return; f.open = f.open === false; C.save(); refreshLibrary(); }
async function newFolder(parent, withItems) {
  const n = await promptBox(T`ชื่อโฟลเดอร์ใหม่`, T`โฟลเดอร์ใหม่`);
  if (!n || !n.trim()) return;
  const f = { id: uid(), name: n.trim(), parent: parent || null, open: true };
  record(withItems ? T`ใส่ในโฟลเดอร์ใหม่` : T`สร้างโฟลเดอร์`, () => {
    folders().push(f);
    if (parent && fById(parent)) fById(parent).open = true;
    if (withItems) for (const i of withItems) place(i, f.id);
  });
  C.save(); refreshLibrary(); flashRow(`[data-fid="${f.id}"]`);
}
async function newFile(folder) {
  let n = await promptBox(T`ชื่อไฟล์ใหม่`, 'main.py');
  if (!n || !n.trim()) return;
  n = n.trim(); if (!/\.\w+$/.test(n)) n += '.py';
  if (badName(n)) { toast(T`ชื่อไฟล์มีตัวอักษรที่ใช้ไม่ได้`, { kind: 'err' }); return; }
  const d = record(T`สร้างไฟล์`, () => C.newLibDoc(n, folder));
  if (folder && fById(folder)) fById(folder).open = true;
  C.save(); refreshLibrary(); C.openDoc(d.id);
}
async function renameDoc(id) {
  const d = dById(id);
  if (!d) return;
  let n = await promptBox(T`ชื่อใหม่`, d.name);
  if (!n || !n.trim() || n.trim() === d.name) return;
  n = n.trim();
  if (badName(n)) { toast(T`ชื่อไฟล์มีตัวอักษรที่ใช้ไม่ได้`, { kind: 'err' }); return; }
  record(T`เปลี่ยนชื่อ`, () => { d.name = n; d.lib = true; });
  C.save(); C.docChanged(); refreshLibrary();
}
async function renameFolder(fid) {
  const f = fById(fid);
  if (!f) return;
  const n = await promptBox(T`ชื่อโฟลเดอร์ใหม่`, f.name);
  if (!n || !n.trim() || n.trim() === f.name) return;
  record(T`เปลี่ยนชื่อ`, () => { f.name = n.trim(); });
  C.save(); refreshLibrary();
}
// delete files (code is gone from the app, Ctrl+Z brings it back) and folders (their other contents move up one level)
async function deleteKeys(keys) {
  const items = keys.map(parse).filter(exists);
  const docIds = items.filter((i) => i.kind === 'file').map((i) => i.id), fIds = new Set(items.filter((i) => i.kind === 'folder').map((i) => i.id));
  if (!docIds.length && !fIds.size) return;
  if (docIds.length) {
    const title = docIds.length === 1 ? T`ลบ ${nameOf({ kind: 'file', id: docIds[0] })} ออกจากคลัง?` : T`ลบ ${docIds.length} ไฟล์ออกจากคลัง?`;
    if (!(await confirmBox(title, T`ลบแค่ในโปรแกรม ไฟล์ในเครื่องไม่ถูกลบ — กด Ctrl+Z เพื่อย้อนกลับได้`, T`ลบ`, true))) return;
  }
  const up = (fid) => { let f = fById(fid); for (let k = 0; f && fIds.has(f.id) && k < 50; k++) f = fById(f.parent); return f ? f.id : null; };
  const label = docIds.length + fIds.size > 1 ? T`ลบ ${docIds.length + fIds.size} รายการ` : fIds.size ? T`ลบโฟลเดอร์` : T`ลบไฟล์`;
  record(label, () => {
    for (const d of C.S.docs) if (!docIds.includes(d.id) && d.folder && fIds.has(d.folder)) d.folder = up(d.folder);
    for (const x of folders()) if (!fIds.has(x.id) && x.parent && fIds.has(x.parent)) x.parent = up(x.parent);
    C.S.folders = folders().filter((f) => !fIds.has(f.id));
    for (const id of docIds) C.removeDoc(id);
  });
  setSel(new Set(), null);
  C.save(); refreshLibrary();
  toast(T`ลบแล้ว`, { label: T`เลิกทำ`, action: undo });
}
function dupDoc(id) {
  const d = dById(id);
  if (!d) return;
  const base = d.name.replace(/(\.py)?$/i, ''), ext = /\.py$/i.test(d.name) ? '.py' : '';
  const n = record(T`ทำสำเนา`, () => C.newLibDoc(`${base} (${T`สำเนา`})${ext}`, d.folder, d.code, d.files));
  C.save(); refreshLibrary(); flashRow(`[data-did="${n.id}"]`);
}
function place(item, fid) {
  if (item.kind === 'file') { const d = dById(item.id); if (d) { d.folder = fid; d.lib = true; } }
  else { const f = fById(item.id); if (f && fid !== f.id && !isUnder(fid, f.id)) f.parent = fid; }
}
function moveTo(items, fid) {
  record(items.length > 1 ? T`ย้าย ${items.length} รายการ` : T`ย้าย`, () => { for (const i of items) place(i, fid); });
  if (fid && fById(fid)) fById(fid).open = true;
  C.save(); refreshLibrary();
}
const safe = (n) => n.replace(/[\\/:*?"<>|]/g, '_').trim() || '_';
const pyName = (n) => safe(/\.\w+$/.test(n) ? n : n + '.py');
// save to a folder on the PC: a whole folder (fid, or null = whole Library) or just the chosen things (items)
async function exportFolder(fid, items) {
  const count = items ? items.reduce((n, i) => n + (i.kind === 'file' ? 1 : countDeep(i.id)), 0) : countDeep(fid);
  if (!count) { toast(T`ยังไม่มีไฟล์ให้เก็บ`); return; }
  if (!native) { toast(T`ใช้ได้ในโปรแกรม Prism Code เท่านั้น`, { kind: 'err' }); return; }
  const dir = await api.invoke('pick:dir');
  if (!dir) return;
  const files = [], used = new Set();
  const put = (rel, text) => { if (used.has(rel.toLowerCase())) return false; used.add(rel.toLowerCase()); files.push({ rel, text }); return true; };
  const addDoc = (d, pre) => {
    let n = pyName(d.name), k = 2;
    while (!put(pre + n, d.code || '')) n = pyName(d.name).replace(/(\.\w+)$/, ` (${k++})$1`);
    for (const [fn, txt] of Object.entries(d.files || {})) put(pre + safe(fn), txt); // the data files the program reads sit next to it
  };
  const add = (id, base) => {
    const pre = base ? base + '/' : '';
    for (const d of filesIn(id).sort(cmp)) addDoc(d, pre);
    for (const f of kids(id).sort(cmp)) add(f.id, pre + safe(f.name));
  };
  if (items) { for (const i of items) { if (i.kind === 'file') addDoc(dById(i.id), 'Prism Code/'); else add(i.id, 'Prism Code/' + safe(nameOf(i))); } }
  else add(fid, fid ? safe(fById(fid).name) : 'Prism Code');
  const r = await api.invoke('fs:write_tree', { dir, files });
  if (r && r.ok) toast(T`เก็บ ${r.written} ไฟล์ลงเครื่องแล้ว: ${dir}`); else toast(T`บันทึกไม่สำเร็จ`, { kind: 'err' });
}
function rowMenu(e) {
  const row = e.target.closest('.lb-row');
  if (row && !sel.has(keyOf(row))) setSel(new Set([keyOf(row)]), keyOf(row)); // right-click on something unselected selects it
  const picked = normalize([...sel]);
  if (row && sel.size > 1) {
    const n = sel.size, anyIn = picked.some((i) => parentOf(i));
    ctxMenu(e.clientX, e.clientY, [
      { icon: 'newfolder', label: T`ใส่ในโฟลเดอร์ใหม่`, run: () => newFolder(null, picked) },
      anyIn ? { icon: 'up', label: T`ย้ายออกนอกโฟลเดอร์`, run: () => moveTo(picked, null) } : null,
      { icon: 'download', label: T`เก็บที่เลือกลงเครื่อง`, run: () => exportFolder(null, picked) },
      '-',
      { icon: 'trash', label: T`ลบ ${n} รายการ`, danger: true, run: () => deleteKeys([...sel]) },
    ], T`เลือกอยู่ ${n} รายการ`);
    return;
  }
  const fr = e.target.closest('.lb-folder'), dr = e.target.closest('.lb-file');
  if (dr) {
    const d = dById(dr.dataset.did);
    if (!d) return;
    ctxMenu(e.clientX, e.clientY, [
      { icon: 'code', label: T`เปิด`, run: () => C.openDoc(d.id) },
      { icon: 'edit', label: T`เปลี่ยนชื่อ`, run: () => renameDoc(d.id) },
      { icon: 'copy', label: T`ทำสำเนา`, run: () => dupDoc(d.id) },
      fById(d.folder) ? { icon: 'up', label: T`ย้ายออกนอกโฟลเดอร์`, run: () => moveTo([{ kind: 'file', id: d.id }], null) } : null,
      { icon: 'download', label: T`บันทึกเป็นไฟล์ .py ในเครื่อง`, run: () => C.saveTextAs(pyName(d.name), d.code || '') },
      '-',
      { icon: 'trash', label: T`ลบ`, danger: true, run: () => deleteKeys(['d:' + d.id]) },
    ], d.name);
  } else if (fr) {
    const f = fById(fr.dataset.fid);
    if (!f) return;
    ctxMenu(e.clientX, e.clientY, [
      { icon: 'plus', label: T`ไฟล์ .py ใหม่ในโฟลเดอร์นี้`, run: () => newFile(f.id) },
      { icon: 'newfolder', label: T`โฟลเดอร์ย่อยใหม่`, run: () => newFolder(f.id) },
      { icon: 'edit', label: T`เปลี่ยนชื่อ`, run: () => renameFolder(f.id) },
      fById(f.parent) ? { icon: 'up', label: T`ย้ายออกนอกโฟลเดอร์`, run: () => moveTo([{ kind: 'folder', id: f.id }], null) } : null,
      { icon: 'download', label: T`เก็บทั้งโฟลเดอร์ลงเครื่อง`, run: () => exportFolder(f.id) },
      '-',
      { icon: 'trash', label: T`ลบโฟลเดอร์ (ไฟล์ข้างในย้ายออกมา)`, danger: true, run: () => deleteKeys(['f:' + f.id]) },
    ], f.name);
  } else {
    ctxMenu(e.clientX, e.clientY, [
      { icon: 'newfolder', label: T`โฟลเดอร์ใหม่`, run: () => newFolder(null) },
      { icon: 'plus', label: T`ไฟล์ .py ใหม่`, run: () => newFile(null) },
      { icon: 'open', label: T`เปิดไฟล์ .py จากเครื่อง`, run: () => C.openFromDisk() },
      { icon: 'download', label: T`เก็บทั้งคลังลงเครื่อง`, run: () => exportFolder(null) },
    ]);
  }
}
export function flashRow(sel_) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (const h of hosts.values()) {
      const el = h.list.querySelector(sel_);
      if (!el) continue;
      if (el.offsetParent !== null) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      el.classList.remove('lb-new'); void el.offsetWidth; el.classList.add('lb-new');
    }
  }));
}

/* ------------------------------------------------------------------- keys */
// Ctrl+Z / Ctrl+Y / Ctrl+A / Delete / F2 / Esc while a library is on screen and the cursor is not in the editor or a box
export function libKey(e) {
  if (!C) return false;
  if (e.target.closest && e.target.closest('input, textarea, select, .cm-editor, [contenteditable="true"]')) return false;
  const h = [...hosts.values()].find(visible);
  if (!h) return false;
  const k = e.key, ctrl = e.ctrlKey || e.metaKey, kl = k.toLowerCase();
  if (ctrl && !e.altKey && kl === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return true; }
  if (ctrl && !e.altKey && (kl === 'y' || (kl === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return true; }
  if (ctrl && !e.altKey && !e.shiftKey && kl === 'a') { e.preventDefault(); setSel(new Set([...h.list.querySelectorAll('.lb-row')].map(keyOf))); return true; }
  if (k === 'Delete' && sel.size) { e.preventDefault(); deleteKeys([...sel]); return true; }
  if (k === 'F2' && sel.size === 1) { e.preventDefault(); const i = parse([...sel][0]); if (i.kind === 'file') renameDoc(i.id); else renameFolder(i.id); return true; }
  if (k === 'Escape' && sel.size) setSel(new Set()); // and carry on (closes menus too)
  return false;
}

/* ------------------------------------------------------------ rubber band */
const scrollerOf = (el) => {
  for (let n = el; n && n !== document.body; n = n.parentElement) if (n.scrollHeight > n.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(n).overflowY)) return n;
  return document.scrollingElement;
};
function marquee(e, h) {
  if (e.button !== 0 || e.target.closest('button, input')) return;
  const sc = scrollerOf(h.list), x0 = e.clientX, y0 = e.clientY, s0 = sc.scrollTop;
  const mod = e.ctrlKey || e.metaKey || e.shiftKey, base = new Set(mod ? sel : []);
  const box = document.createElement('div'); box.id = 'lb-marq';
  let on = false, last = e, raf = 0;
  const upd = () => {
    const scr = sc === document.scrollingElement ? { top: 0, bottom: innerHeight } : sc.getBoundingClientRect();
    const sy = y0 + s0 - sc.scrollTop; // where the band started, as the list scrolls under it
    const x1 = Math.min(x0, last.clientX), x2 = Math.max(x0, last.clientX), y1 = Math.min(sy, last.clientY), y2 = Math.max(sy, last.clientY);
    const top = Math.max(y1, scr.top), bottom = Math.min(y2, scr.bottom);
    Object.assign(box.style, { left: x1 + 'px', top: top + 'px', width: x2 - x1 + 'px', height: Math.max(0, bottom - top) + 'px' });
    const next = new Set(base);
    h.list.querySelectorAll('.lb-row').forEach((r) => { const rr = r.getBoundingClientRect(); if (rr.bottom > y1 && rr.top < y2 && rr.right > x1 && rr.left < x2) next.add(keyOf(r)); });
    setSel(next);
    // near the top / bottom edge: scroll, so a long list can be swept in one go
    if (last.clientY < scr.top + 28) sc.scrollTop -= 12; else if (last.clientY > scr.bottom - 28) sc.scrollTop += 12;
  };
  const tick = () => { upd(); raf = requestAnimationFrame(tick); };
  const mv = (ev) => {
    last = ev;
    if (!on) { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 4) return; on = true; document.body.appendChild(box); document.body.classList.add('lb-marqueeing'); tick(); }
    if (on) upd(); // follow the mouse at once; the frame loop only keeps auto-scroll going while it rests at an edge
  };
  const stop = () => { removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', up, true); cancelAnimationFrame(raf); box.remove(); document.body.classList.remove('lb-marqueeing'); };
  const up = (ev) => { if (on && ev) { last = ev; upd(); } const was = on; stop(); if (was) noClickUntil = Date.now() + 80; else if (!mod) setSel(new Set()); };
  addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', up, true);
}

/* ------------------------------------------------------------- drag & drop */
let drag = null, noClickUntil = 0;
const ghost = document.createElement('div'); ghost.id = 'lb-ghost'; document.body.appendChild(ghost);
function press(e, row) {
  if (e.button !== 0) return;
  const k = keyOf(row);
  if ((e.ctrlKey || e.metaKey || e.shiftKey) && !sel.has(k)) return; // a modifier click selects, it doesn't drag
  const x0 = e.clientX, y0 = e.clientY;
  const mv = (ev) => {
    if (!drag) { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return; begin(ev, row); }
    move(ev);
  };
  const stop = () => { removeEventListener('pointermove', mv, true); removeEventListener('pointerup', up, true); removeEventListener('pointercancel', cancel, true); removeEventListener('keydown', key, true); };
  const up = (ev) => { stop(); if (drag) end(ev); };
  const cancel = () => { stop(); if (drag) end(null); };
  const key = (ev) => { if (ev.key === 'Escape' && drag) { ev.preventDefault(); ev.stopPropagation(); stop(); end(null); } };
  addEventListener('pointermove', mv, true); addEventListener('pointerup', up, true); addEventListener('pointercancel', cancel, true); addEventListener('keydown', key, true);
}
function begin(ev, row) {
  const k = keyOf(row);
  if (!sel.has(k)) setSel(new Set([k]), k); // dragging something unselected selects just that
  const items = normalize([...sel]);
  if (!items.length) return;
  ghost.innerHTML = ''; ghost.className = 'on';
  const list = row.closest('.lb-list');
  const cards = items.slice(0, 3).map((it, i) => {
    const src = list.querySelector(it.kind === 'file' ? `[data-did="${it.id}"]` : `[data-fid="${it.id}"]`) || row, r = src.getBoundingClientRect();
    const c = document.createElement('div');
    c.className = 'dg-card';
    c.innerHTML = (it.kind === 'file' ? '<span class="lb-py">py</span>' : icon('folder')) + `<span>${esc(nameOf(it))}</span>` + (items.length === 1 && it.kind === 'folder' ? `<b class="dg-n">${countDeep(it.id)}</b>` : '');
    c.style.width = Math.min(240, r.width) + 'px';
    c._from = { x: r.left - ev.clientX, y: r.top - ev.clientY };
    c.style.transform = `translate(${c._from.x}px,${c._from.y}px)`; // starts on its row…
    c.style.zIndex = 50 - i;
    ghost.appendChild(c);
    return c;
  });
  if (items.length > 1) { const b = document.createElement('b'); b.className = 'dg-count'; b.textContent = items.length; ghost.appendChild(b); }
  const hint = document.createElement('div'); hint.className = 'dg-hint'; ghost.appendChild(hint);
  ghost.style.transform = `translate(${ev.clientX}px,${ev.clientY}px)`;
  void ghost.offsetWidth; // …then they lift and spring under the mouse, stacked
  cards.forEach((c, i) => { c.style.transition = `transform .38s var(--spring, cubic-bezier(.2,1.3,.4,1)) ${i * 0.03}s, opacity .3s`; c.style.transform = `translate(${16 + i * 5}px,${12 + i * 5}px) rotate(${i ? (i % 2 ? 1 : -1) * 2.5 : -2.5}deg) scale(1.03)`; });
  document.querySelectorAll('.lb-row.sel').forEach((r) => r.classList.add('dragging-src'));
  document.body.classList.add('lb-dragging');
  let sc = row.parentElement; while (sc && sc !== document.body && !(sc.scrollHeight > sc.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
  drag = { items, cards, hint, tgt: null, hl: null, x: ev.clientX, y: ev.clientY, sc: sc && sc !== document.body ? sc : null, hover: null, hoverT: 0 };
}
function target(ev) {
  const { items } = drag, el = document.elementFromPoint(ev.clientX, ev.clientY);
  if (!el) return null;
  const allAt = (fid) => items.every((i) => parentOf(i) === fid);
  let fr = el.closest('.lb-folder');
  const dr = el.closest('.lb-file');
  if (!fr && dr) { // over a file = the folder that file is in
    const d = dById(dr.dataset.did), fid = d && fById(d.folder) ? d.folder : null;
    fr = fid ? dr.closest('.lb-list').querySelector(`.lb-folder[data-fid="${fid}"]`) : null;
    if (!fr) return allAt(null) ? { kind: 'none', label: T`อยู่ตรงนี้แล้ว`, ico: 'x' } : { kind: 'root', el: dr.closest('.lb-list'), cls: 'lb-droproot', label: T`ย้ายออกมานอกโฟลเดอร์`, ico: 'up' };
  }
  if (fr) {
    const fid = fr.dataset.fid, f = fById(fid);
    if (items.some((i) => i.kind === 'folder' && (fid === i.id || isUnder(fid, i.id)))) return { kind: 'none', label: T`ใส่โฟลเดอร์ในตัวเองไม่ได้`, ico: 'x' };
    if (allAt(fid)) return { kind: 'none', label: T`อยู่ในโฟลเดอร์นี้แล้ว`, ico: 'x', el: fr, cls: 'lb-same' };
    return { kind: 'into', fid, el: fr, cls: 'lb-drop', label: T`ใส่ใน “${f ? f.name : ''}”`, ico: 'folder' };
  }
  const list = el.closest('.lb-list');
  if (list) return allAt(null) ? { kind: 'none', label: T`ปล่อยที่เดิม`, ico: 'x' } : { kind: 'root', el: list, cls: 'lb-droproot', label: T`ย้ายออกมานอกโฟลเดอร์`, ico: 'up' };
  if (items.some((i) => i.kind === 'file')) { const ed = el.closest('#ed-col'); if (ed) return { kind: 'open', el: ed, cls: 'lb-dropopen', label: T`เปิดไฟล์นี้ในช่องโค้ด`, ico: 'code' }; }
  return null;
}
function move(ev) {
  const d = drag; d.x = ev.clientX; d.y = ev.clientY;
  ghost.style.transform = `translate(${ev.clientX}px,${ev.clientY}px)`;
  const t = target(ev);
  if (d.hl && (!t || d.hl !== t.el)) { d.hl.classList.remove('lb-drop', 'lb-droproot', 'lb-dropopen', 'lb-same'); d.hl = null; }
  if (t && t.el && t.cls) { t.el.classList.add(t.cls); d.hl = t.el; }
  d.tgt = t && t.kind !== 'none' ? t : null;
  const label = t ? t.label : T`ปล่อยเพื่อยกเลิก`, ico = t ? t.ico : 'x';
  if (d.hint._k !== label) { d.hint._k = label; d.hint.innerHTML = `${icon(ico)}<span>${esc(label)}</span>`; }
  ghost.classList.toggle('ok', !!d.tgt); ghost.classList.toggle('into', !!(d.tgt && d.tgt.kind === 'into'));
  // resting on a closed folder opens it (so a file can go into a folder inside it)
  const fid = t && t.kind === 'into' ? t.fid : null;
  if (fid !== d.hover) { d.hover = fid; clearTimeout(d.hoverT); if (fid && fById(fid) && fById(fid).open === false) d.hoverT = setTimeout(() => { if (drag && drag.hover === fid) { fById(fid).open = true; for (const h of hosts.values()) renderHost(h); markSrc(); } }, 650); }
  // near the top / bottom of a scrolling list: scroll it
  if (d.sc) { const r = d.sc.getBoundingClientRect(); if (ev.clientX > r.left && ev.clientX < r.right) d.sc.scrollTop += ev.clientY < r.top + 28 ? -10 : ev.clientY > r.bottom - 28 ? 10 : 0; }
}
function markSrc() { // the list was re-drawn while dragging: dim the carried rows again
  document.querySelectorAll('.lb-row.sel').forEach((x) => x.classList.add('dragging-src'));
  drag.hl = null;
}
function end(ev) {
  const d = drag; drag = null; noClickUntil = Date.now() + 80;
  clearTimeout(d.hoverT);
  document.body.classList.remove('lb-dragging');
  if (d.hl) d.hl.classList.remove('lb-drop', 'lb-droproot', 'lb-dropopen', 'lb-same');
  document.querySelectorAll('.dragging-src').forEach((x) => x.classList.remove('dragging-src'));
  const t = ev ? d.tgt : null;
  // throw the cards into the target, or send them home
  let to = null;
  if (t && t.el) {
    const r = t.el.getBoundingClientRect();
    to = t.kind === 'into' ? { x: r.left + 34 - d.x, y: r.top + r.height / 2 - 14 - d.y } : { x: Math.min(r.width / 2, 140) + r.left - d.x - 60, y: (t.kind === 'open' ? r.top + 60 : Math.min(r.bottom, d.y + 40)) - d.y };
  }
  d.cards.forEach((c, i) => {
    c.style.transition = to ? `transform .36s cubic-bezier(.5,0,.75,0) ${i * 0.04}s, opacity .36s ${i * 0.04}s` : 'transform .34s cubic-bezier(.3,.7,.4,1), opacity .34s';
    c.style.transform = to ? `translate(${to.x}px,${to.y}px) scale(.25)` : `translate(${c._from.x}px,${c._from.y}px)`;
    c.style.opacity = to ? 0 : 0.4;
  });
  d.hint.style.opacity = 0;
  const cnt = ghost.querySelector('.dg-count'); if (cnt) cnt.style.opacity = 0;
  setTimeout(() => { if (!drag) { ghost.className = ''; ghost.innerHTML = ''; } }, 440);
  if (!t) return;
  if (t.kind === 'open') { setTimeout(() => d.items.filter((i) => i.kind === 'file').forEach((i) => C.openDoc(i.id)), 200); return; }
  const fid = t.kind === 'into' ? t.fid : null;
  setTimeout(() => {
    moveTo(d.items, fid);
    if (fid) flashRow(`.lb-folder[data-fid="${fid}"]`); // the folder gulps them
    for (const i of d.items) flashRow(i.kind === 'file' ? `[data-did="${i.id}"]` : `.lb-folder[data-fid="${i.id}"]`);
  }, 300);
}
