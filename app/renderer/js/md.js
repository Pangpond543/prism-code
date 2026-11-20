// Tiny Markdown → HTML for problem text (headings, bold/italic, `code`, ``` blocks, lists, rules, paragraphs).
// Everything is escaped first; code blocks keep their text exactly (they are the expected output!).
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function inline(s) {
  // code spans become placeholders first, so **bold `with code` inside** still works
  const codes = [];
  let h = esc(String(s).replace(/`([^`]+)`/g, (_m, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; }));
  h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<i>$2</i>');
  return h.replace(/\u0000(\d+)\u0000/g, (_m, i) => `<code>${esc(codes[+i])}</code>`);
}

// blocks: [{type:'code', lang, text, label}] are also returned so callers can find sample files / outputs
export function renderMd(md, { codeAttrs } = {}) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  let html = '', i = 0, para = [], list = [];
  const flushPara = () => { if (para.length) { html += `<p>${para.map(inline).join('<br>')}</p>`; para = []; } };
  const flushList = () => {
    if (!list.length) return;
    let out = '';
    const stack = [];
    for (const it of list) {
      while (stack.length && stack[stack.length - 1] > it.depth) { out += '</li></ul>'; stack.pop(); }
      if (!stack.length || stack[stack.length - 1] < it.depth) { out += '<ul>'; stack.push(it.depth); } else out += '</li>';
      out += `<li>${inline(it.text)}`;
    }
    while (stack.length) { out += '</li></ul>'; stack.pop(); }
    html += out;
    list = [];
  };
  let blockNo = 0;
  while (i < lines.length) {
    const ln = lines[i];
    const fence = /^\s*```(\w*)\s*$/.exec(ln);
    if (fence) {
      flushPara(); flushList();
      const body = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++;
      const attrs = codeAttrs ? codeAttrs(blockNo, body.join('\n')) : '';
      html += `<pre class="md-code" data-block="${blockNo}" ${attrs}><code>${esc(body.join('\n'))}</code></pre>`;
      blockNo++;
      continue;
    }
    if (/^\s*(---|\*\*\*|___)\s*$/.test(ln)) { flushPara(); flushList(); html += '<hr>'; i++; continue; }
    const h = /^(#{1,6})\s+(.*)$/.exec(ln);
    if (h) { flushPara(); flushList(); const n = Math.min(4, h[1].length + 1); html += `<h${n}>${inline(h[2])}</h${n}>`; i++; continue; }
    const li = /^(\s*)[*\-+]\s+(.*)$/.exec(ln) || /^(\s*)\d+[.)]\s+(.*)$/.exec(ln);
    if (li) { flushPara(); list.push({ depth: Math.floor(li[1].replace(/\t/g, '    ').length / 2), text: li[2] }); i++; continue; }
    if (!ln.trim()) { flushPara(); flushList(); i++; continue; }
    if (list.length && /^\s+\S/.test(ln)) { list[list.length - 1].text += ' ' + ln.trim(); i++; continue; }
    flushList();
    para.push(ln);
    i++;
  }
  flushPara(); flushList();
  return html;
}

// Code blocks with the sentence that introduces them (used to find sample input files / expected output).
export function mdBlocks(md) {
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let lastText = '';
  for (let i = 0; i < lines.length; i++) {
    const fence = /^\s*```(\w*)\s*$/.exec(lines[i]);
    if (fence) {
      const body = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i++]);
      out.push({ label: lastText, text: body.join('\n') });
      continue;
    }
    if (lines[i].trim()) lastText = lines[i].trim();
  }
  return out;
}
