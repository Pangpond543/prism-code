// .ipynb / .py → a problem pack. A markdown cell that starts a "problem" (a heading) is followed by its code cells.
// From the markdown we take the sample console output (to check against) and the sample text files
// (input files are put in the Files tab; files the code writes become files to check).
import { mdBlocks } from './md.js';

const src = (c) => (Array.isArray(c.source) ? c.source.join('') : String(c.source || ''));
// Jupyter magics / shell lines can't run here: keep them visible as comments
const cleanCode = (s) => s.replace(/\r\n?/g, '\n').split('\n').map((l) => (/^\s*[%!]/.test(l) ? '# ' + l + '   ← (ใช้ได้เฉพาะใน Jupyter)' : l)).join('\n').replace(/\s+$/, '') + '\n';

const SAMPLE_OUT = /sample\s*console\s*output|ตัวอย่างการทำงาน|ตัวอย่างผลลัพธ์บนหน้าจอ|output\s*:?\s*$|ผลลัพธ์ที่ได้/i;
const FILE_NAME = /`?([\w\-ก-๙]+\.(txt|csv|dat))`?/i;

function writesFile(codes, name) {
  const re = new RegExp(`open\\(\\s*["']${name.replace(/[.]/g, '\\.')}["']\\s*,\\s*["'][wa]`, 'i');
  return codes.some((c) => re.test(c));
}

// problem from one markdown text + its code cells
function makeProblem(md, codes, n, idPrefix) {
  const blocks = mdBlocks(md);
  const files = {}, expectFiles = {};
  let sample = null;
  for (const b of blocks) {
    const fm = FILE_NAME.exec(b.label);
    if (fm && !SAMPLE_OUT.test(b.label)) {
      const name = fm[1];
      const out = writesFile(codes, name) || (/ผลลัพธ์|output|result/i.test(b.label) && !/ต้นฉบับ|input|ข้อมูลเข้า/i.test(b.label));
      if (out) expectFiles[name] = b.text.replace(/\s+$/, '') + '\n';
      else files[name] = b.text.replace(/\s+$/, '') + '\n';
    } else if (SAMPLE_OUT.test(b.label) || (!sample && /console|output/i.test(b.label))) {
      sample = b.text;
    }
  }
  const head = /^#{1,6}\s+(.+)$/m.exec(md);
  let title = head ? head[1].replace(/\*\*/g, '').trim() : `ส่วนที่ ${n}`;
  const short = (/\(([^)]+)\)\s*$/.exec(title) || [])[1] || '';
  title = title.replace(/\s*\([^)]*\)\s*$/, '').replace(/^ข้อที่\s*\d+\s*[:：.]\s*/, '');
  const tests = [];
  if (sample !== null || Object.keys(expectFiles).length) tests.push({ name: 'ตัวอย่างในโจทย์', sample: sample ?? '', files: { ...files }, expectFiles });
  return {
    id: `${idPrefix}-${n}`, no: n, title, short, topics: [], md,
    starter: codes[0] || '', variants: codes.slice(1), solution: null,
    files, outFiles: Object.keys(expectFiles), tests, buggy: [], fromNotebook: true,
  };
}

export function packFromNotebook(text, fileName) {
  const nb = JSON.parse(text);
  const cells = (nb.cells || (nb.worksheets && nb.worksheets[0] && nb.worksheets[0].cells) || []).filter((c) => c.cell_type === 'markdown' || c.cell_type === 'code');
  const id = 'nb-' + Date.now().toString(36);
  const problems = [];
  let intro = '', cur = null;
  const push = () => { if (cur && (cur.codes.length || cur.md.trim())) problems.push(makeProblem(cur.md, cur.codes, problems.length + 1, id)); cur = null; };
  for (const c of cells) {
    const s = src(c);
    if (c.cell_type === 'markdown') {
      // a problem starts at a heading that names one ("## ข้อที่ 2: …", "Problem 3", "โจทย์ …") — the words in the body
      // don't count (an intro often lists "ข้อที่ 1 … ข้อที่ 4")
      const head = (/^\s*(?:---\s*\n)?\s*(#{1,4})\s+(.+)$/m.exec(s) || []);
      const startsProblem = !!head[2] && (/^(ข้อ(ที่)?\s*\d|problem|exercise|question|โจทย์|task|lab|part|ex\.?\s*\d)/i.test(head[2].replace(/\*\*/g, '').trim()) || ((cur || problems.length) && head[1].length >= 2));
      if (!cur && !problems.length && !startsProblem) { intro += (intro ? '\n\n' : '') + s; continue; }
      if (cur && !cur.codes.length) { cur.md += '\n\n' + s; continue; }   // several markdown cells before the code
      push();
      cur = { md: s, codes: [] };
    } else {
      const code = cleanCode(s);
      if (!code.trim()) continue;
      // a cell that only prints the student's name/ID is not a problem
      if (!cur) {
        if (problems.length === 0 && /^print\([^)]*\)\s*$/.test(code.trim()) && !intro.includes('```')) { intro += '\n\n```python\n' + code + '```'; continue; }
        cur = { md: `## เซลล์โค้ด ${problems.length + 1}`, codes: [] };
      }
      cur.codes.push(code);
    }
  }
  push();
  if (!problems.length) problems.push(makeProblem('## โค้ดในไฟล์', [''], 1, id));
  const name = String(fileName || 'Notebook').replace(/\.ipynb$/i, '');
  return { id, name, sub: fileName, intro, problems, source: 'ipynb', added: Date.now() };
}

export function looksLikeNotebook(text) {
  try { const j = JSON.parse(text); return !!(j && (j.cells || j.worksheets)); } catch { return false; }
}
