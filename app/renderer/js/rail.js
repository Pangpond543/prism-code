// Name rail (from Prism Rec's date rail): a thin line on the right of a scrolling list with one tick per section
// ([data-mark] elements: folders, first letters, problem sets). Hover a tick → its name pops up and the list glides
// there; the glowing thumb shows where you are; click / drag the empty rail to scroll. Hidden when nothing scrolls.
import { esc } from './core.js';

export function createRail(scroller, railEl, { isOn = () => true } = {}) {
  railEl.classList.add('nrail', 'hidden');
  railEl.innerHTML = '<div class="rail-line"></div><div class="rail-ticks"></div><i class="rail-thumb"></i><div class="rail-tip glass hidden"></div>';
  const ticks = railEl.querySelector('.rail-ticks'), thumb = railEl.querySelector('.rail-thumb'), tip = railEl.querySelector('.rail-tip');
  let marks = [], hot = -1, raf = 0, drag = false;
  const topOf = (el) => el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;

  function build() {
    const show = isOn() && scroller.scrollHeight > scroller.clientHeight + 8;
    railEl.classList.toggle('hidden', !show);
    if (!show) { marks = []; return; }
    const H = railEl.clientHeight, max = Math.max(1, scroller.scrollHeight);
    marks = [...scroller.querySelectorAll('[data-mark]')].filter((el) => el.offsetParent !== null).map((el) => {
      const top = topOf(el);
      return { el, top, y: Math.min(H - 3, (top / max) * H), title: el.dataset.mark, sub: el.dataset.markSub || '', folder: el.classList.contains('lb-folder') };
    });
    for (let i = 1; i < marks.length; i++) marks[i].y = Math.max(marks[i].y, marks[i - 1].y + 7); // easy to hover
    ticks.innerHTML = marks.map((m) => `<i class="${m.folder ? 'fold' : ''}" style="top:${m.y}px"></i>`).join('');
    sync();
  }
  function sync() {
    if (railEl.classList.contains('hidden')) return;
    const H = railEl.clientHeight, max = Math.max(1, scroller.scrollHeight);
    thumb.style.top = (scroller.scrollTop / max) * H + 'px';
    thumb.style.height = Math.max(18, (scroller.clientHeight / max) * H) + 'px';
    let cur = -1;
    marks.forEach((m, i) => { if (m.top <= scroller.scrollTop + 40) cur = i; });
    ticks.querySelectorAll('i').forEach((t, i) => t.classList.toggle('cur', i === cur));
  }
  function nearest(clientY) {
    const y = clientY - railEl.getBoundingClientRect().top;
    let best = -1, bd = 1e9;
    marks.forEach((m, i) => { const d = Math.abs(m.y - y); if (d < bd) { bd = d; best = i; } });
    return { i: best, close: bd < 12 };
  }
  function go(i) {
    const m = marks[i];
    if (!m) return;
    scroller.scrollTo({ top: Math.max(0, m.top - 10), behavior: 'smooth' });
    m.el.classList.remove('rail-flash'); void m.el.offsetWidth; m.el.classList.add('rail-flash');
    setTimeout(() => m.el.classList.remove('rail-flash'), 900);
  }
  function showTip(i) {
    ticks.querySelectorAll('i').forEach((t, k) => t.classList.toggle('hot', k === i));
    const m = marks[i];
    if (!m) { tip.classList.add('hidden'); return; }
    tip.innerHTML = `<b>${esc(m.title)}</b>${m.sub ? `<span>${esc(m.sub)}</span>` : ''}`;
    tip.style.top = m.y + 'px';
    tip.classList.remove('hidden');
  }
  scroller.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
  new ResizeObserver(() => build()).observe(scroller);
  const toY = (e) => { const r = railEl.getBoundingClientRect(); return ((e.clientY - r.top) / r.height) * scroller.scrollHeight - scroller.clientHeight / 2; };
  railEl.onpointermove = (e) => {
    if (drag) { scroller.scrollTop = toY(e); return; }
    const { i, close } = nearest(e.clientY);
    if (!close) { hot = -1; showTip(-1); return; }
    if (i !== hot) { hot = i; showTip(i); go(i); } // hover a tick → glide to that section
  };
  railEl.onpointerleave = () => { if (!drag) { hot = -1; showTip(-1); } };
  railEl.onpointerdown = (e) => {
    if (nearest(e.clientY).close) return;
    drag = true; railEl.setPointerCapture(e.pointerId); railEl.classList.add('drag');
    scroller.scrollTop = toY(e);
  };
  railEl.onpointerup = railEl.onpointercancel = () => { drag = false; railEl.classList.remove('drag'); };
  return { build, sync };
}
