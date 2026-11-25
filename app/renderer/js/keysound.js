// Keyboard sounds — simulated key switches (Blue, Brown, Red, Topre, buckling spring, typewriter …).
// Nothing here is a recording: every press is synthesised once into a few AudioBuffers (offline, no files, no net):
//   click   — the click jacket / bar of a clicky switch (very short, bright)
//   bump    — the tactile leg scraping over the bump (soft, mid)
//   hit     — bottom-out: a noise burst through a band filter (stem on housing, keycap on plate)
//   body    — damped resonances of the keycap + case (low = "thock", high = "clack")
//   ping    — the steel spring ringing (unlubed springs, buckling springs)
// plus the release (upstroke), stabiliser rattle on the long keys, left / right panning by key position and a row pitch.
import { recall, remember, bus } from './core.js';

const KEY = 'prism.code.keysound';
const VARIANTS = 6; // per key kind and stroke, so no two presses sound the same
const KIND = { key: { low: 1, long: 1, rattle: 0, big: 1 }, wide: { low: 0.9, long: 1.1, rattle: 1, big: 1.08 },
  enter: { low: 0.82, long: 1.2, rattle: 2, big: 1.18 }, space: { low: 0.68, long: 1.35, rattle: 3, big: 1.3 } };

/* ------------------------------------------------------------ the switches */
// one generic "switch" model; each pack only sets numbers. f = Hz, tau = ms, amp = relative
const sw = (p) => Object.assign((kind, stroke, r) => {
  const k = KIND[kind], j = (x, s = 0.04) => x * (1 + (r() * 2 - 1) * s), ev = [];
  const bottom = (t, g, fm) => {
    const h = p.hit;
    ev.push({ at: t, noise: { amp: h.amp * g * k.big, tau: h.tau * k.long, f: j(h.f * fm * Math.sqrt(k.low)), q: h.q } });
    ev.push({ at: t, modes: p.body.map(([f, tau, a]) => [j(f * fm * k.low), tau * k.long, a * g * k.big]) });
    if (p.thump) ev.push({ at: t, modes: [[j(105 * k.low), 9 * k.long, p.thump * g * k.big]] });
    if (p.ping && (stroke === 'down' || p.pingUp)) ev.push({ at: t + 0.4, modes: p.ping.map(([f, tau, a]) => [j(f, 0.015), tau, a * g * (0.7 + r() * 0.6)]) });
    for (let i = 0; i < k.rattle * (p.rattle ?? 1); i++) // stabiliser wire: small late taps on the long keys
      ev.push({ at: t + j(2.5 + i * 3.6, 0.3), noise: { amp: h.amp * 0.2 * g, tau: 1, f: j(3300), q: 2 } });
  };
  if (stroke === 'down') {
    if (p.click) {
      ev.push({ at: 0, noise: { amp: p.click, tau: 0.45, f: j(p.clickF, 0.06), q: 1.5 } });
      ev.push({ at: 0, modes: (p.clickModes || [[1.35, 1.6, 0.5], [0.72, 2.2, 0.35]]).map(([m, tau, a]) => [j(p.clickF * m), tau, p.click * a]) });
    }
    if (p.bump) ev.push({ at: 0, noise: { amp: p.bump, tau: p.bumpTau || 2.4, f: j(p.bumpF || 950), q: 0.7 } });
    bottom(p.click || p.bump ? j(p.travel || 9, 0.15) : 0, 1, 1);
  } else {
    if (!p.up && !p.clickUp) return ev;
    if (p.clickUp) {
      ev.push({ at: 0, noise: { amp: p.clickUp, tau: 0.4, f: j(p.clickF * 1.1, 0.06), q: 1.5 } });
      ev.push({ at: 0, modes: [[j(p.clickF * 1.5), 1.4, p.clickUp * 0.4]] });
    }
    if (p.up) bottom(p.clickUp ? j(3, 0.2) : 0, p.up, p.upHi || 1.12);
  }
  return ev;
}, { lp: p.lp || 0 }); // lp = low-pass over the whole sound (dampened switches)

// a typewriter: type bar strikes the platen, the escapement ticks the carriage on, Enter = carriage return + bell
const typewriter = (kind, stroke, r) => {
  if (stroke === 'up') return [];
  const j = (x, s = 0.04) => x * (1 + (r() * 2 - 1) * s), ev = [];
  const esc = (t, a = 1) => { ev.push({ at: t, noise: { amp: 0.45 * a, tau: 0.7, f: j(4200), q: 1.6 } }, { at: t, modes: [[j(4800), 5, 0.14 * a], [j(3300), 7, 0.1 * a]] }); };
  if (kind === 'key') {
    ev.push({ at: 0, noise: { amp: 1.1, tau: 2.4, f: j(2600), q: 1 } });
    ev.push({ at: 0, modes: [[j(1250), 14, 0.3], [j(2350), 10, 0.22], [j(3650), 8, 0.16], [j(5100), 6, 0.1], [j(150), 25, 0.35], [j(260), 15, 0.2]] });
    esc(j(30, 0.15));
  } else if (kind === 'space' || kind === 'wide') {
    ev.push({ at: 0, noise: { amp: 0.55, tau: 1.6, f: j(1700), q: 0.9 } }, { at: 0, modes: [[j(210), 18, 0.25], [j(700), 9, 0.1]] });
    esc(j(kind === 'space' ? 22 : 14, 0.15), kind === 'space' ? 1 : 0.8);
  } else { // carriage return: lever, ratchet running, then the bell
    ev.push({ at: 0, noise: { amp: 0.9, tau: 3, f: j(1500), q: 0.9 } }, { at: 0, modes: [[j(180), 30, 0.35], [j(900), 15, 0.2]] });
    for (let i = 0, t = 45; i < 13; i++, t += j(19, 0.12) + i * 0.6) ev.push({ at: t, noise: { amp: 0.3 + r() * 0.12, tau: 0.6, f: j(3800), q: 1.8 } }, { at: t, modes: [[j(2900), 4, 0.06]] });
    const b = j(2093, 0.01);
    ev.push({ at: 360, modes: [[b, 700, 0.34], [b * 1.003, 650, 0.14], [b * 2.76, 300, 0.11], [b * 5.4, 150, 0.05]] });
    ev.push({ at: 360, noise: { amp: 0.25, tau: 0.5, f: 5000, q: 1.2 } });
  }
  return ev;
};

// type: click = คลิก, tact = สัมผัส, lin = ลื่น, other = อื่นๆ · color = the switch's stem / look (dot in the menu)
export const PACKS = [
  { id: 'blue', name: 'Blue', type: 'click', color: '#3d7bff', desc: 'คลิกเสียงใส ดังชัด ทุกครั้งที่กด', gain: 1,
    build: sw({ click: 1, clickF: 4200, clickUp: 0.5, travel: 9, hit: { amp: 0.55, f: 2400, q: 1.1, tau: 2.2 },
      body: [[1700, 7, 0.25], [2900, 5, 0.18], [620, 10, 0.12]], thump: 0.12, ping: [[5600, 25, 0.02]], up: 0.35, upHi: 1.15 }) },
  { id: 'jade', name: 'Box Jade', type: 'click', color: '#1fb57e', desc: 'คลิกหนา แน่น เสียงคมกว่า Blue', gain: 1.05,
    build: sw({ click: 1.25, clickF: 3300, clickModes: [[1.3, 1.8, 0.55], [0.73, 4, 0.4], [1.9, 1.2, 0.25]], clickUp: 0.75, travel: 7,
      hit: { amp: 0.55, f: 2000, q: 1.2, tau: 2.4 }, body: [[1450, 8, 0.24], [2600, 5, 0.15], [700, 11, 0.12]], thump: 0.15, up: 0.3, upHi: 1.12 }) },
  { id: 'brown', name: 'Brown', type: 'tact', color: '#9a6a43', desc: 'มีจังหวะสะดุดเบาๆ เสียงนุ่มกลางๆ', gain: 0.95,
    build: sw({ bump: 0.35, travel: 10, hit: { amp: 0.6, f: 1900, q: 1, tau: 2.6 }, body: [[1350, 9, 0.25], [2500, 6, 0.14], [520, 14, 0.16]],
      thump: 0.18, ping: [[5200, 30, 0.025]], up: 0.4, upHi: 1.1 }) },
  { id: 'panda', name: 'Panda', type: 'tact', color: '#d9a066', desc: 'สะดุดชัด เสียงทุ้มหนัก “ตึก ตึก”', gain: 1,
    build: sw({ bump: 0.55, bumpF: 1300, bumpTau: 1.8, travel: 8, hit: { amp: 0.75, f: 1500, q: 1.1, tau: 3 },
      body: [[520, 16, 0.32], [1050, 10, 0.22], [2100, 6, 0.1]], thump: 0.32, up: 0.5, upHi: 1.15, lp: 6000 }) },
  { id: 'red', name: 'Red', type: 'lin', color: '#e5484d', desc: 'ลื่นตลอด ไม่มีคลิก เสียงกระทบเบาๆ', gain: 0.9,
    build: sw({ bump: 0.05, bumpTau: 3, travel: 5, hit: { amp: 0.55, f: 2100, q: 1, tau: 2.4 }, body: [[1500, 8, 0.22], [2700, 5.5, 0.14], [560, 12, 0.14]],
      thump: 0.16, ping: [[5400, 35, 0.035]], up: 0.45, upHi: 1.12 }) },
  { id: 'black', name: 'Black', type: 'lin', color: '#2d2f36', desc: 'ลื่นแบบหนักมือ เสียงต่ำ มีสปริงดังนิดๆ', gain: 0.95,
    build: sw({ hit: { amp: 0.65, f: 1700, q: 1, tau: 2.8 }, body: [[1150, 10, 0.28], [2200, 7, 0.15], [430, 16, 0.2]],
      thump: 0.25, ping: [[4700, 45, 0.05], [6300, 30, 0.02]], up: 0.55, upHi: 1.08 }) },
  { id: 'creamy', name: 'Creamy', type: 'lin', color: '#f3d36b', desc: 'ลื่นลงน้ำมัน เสียงทุ้มกลมเหมือนหินอ่อน', gain: 0.95,
    build: sw({ hit: { amp: 0.45, f: 1100, q: 0.9, tau: 3 }, body: [[420, 18, 0.35], [780, 12, 0.22], [1500, 7, 0.08]],
      thump: 0.3, up: 0.35, upHi: 1.2, lp: 4500 }) },
  { id: 'silent', name: 'Silent', type: 'lin', color: '#f39ab4', desc: 'มียางกันเสียง เบามาก เหมาะกับห้องสมุด', gain: 0.55,
    build: sw({ hit: { amp: 0.35, f: 900, q: 0.8, tau: 2 }, body: [[700, 6, 0.12], [380, 10, 0.14]], thump: 0.2, up: 0.15, upHi: 1.1, lp: 2200, rattle: 0.3 }) },
  { id: 'topre', name: 'Topre', type: 'tact', color: '#8a8f99', desc: 'โดมยาง + สปริง เสียงทุ้มอู้ “ป็อก” ทั้งกดและปล่อย', gain: 0.95,
    build: sw({ bump: 0.3, bumpF: 600, travel: 7, hit: { amp: 0.4, f: 700, q: 0.8, tau: 3.5 }, body: [[330, 22, 0.4], [640, 14, 0.25], [1250, 8, 0.08]],
      thump: 0.38, up: 0.75, upHi: 1.25, lp: 3200, rattle: 0.5 }) },
  { id: 'spring', name: 'Buckling spring', type: 'click', color: '#c9ccd2', desc: 'สปริงงอแบบคีย์บอร์ดยุค 80 ดังมาก มีเสียงสปริงก้อง', gain: 1.1,
    build: sw({ click: 0.9, clickF: 2600, travel: 6, hit: { amp: 0.9, f: 1800, q: 1, tau: 3 }, body: [[1100, 12, 0.3], [2300, 9, 0.2], [480, 15, 0.18]],
      thump: 0.3, ping: [[3100, 90, 0.12], [4650, 70, 0.07]], pingUp: true, up: 0.6, upHi: 1.1 }) },
  { id: 'laptop', name: 'Laptop', type: 'other', color: '#b5bcc9', desc: 'ปุ่มบางแบบโน้ตบุ๊ก เสียงแห้งสั้นๆ', gain: 0.7,
    build: sw({ hit: { amp: 0.45, f: 2600, q: 1.3, tau: 1.3 }, body: [[2100, 3.5, 0.15], [900, 5, 0.12]], thump: 0.06, up: 0.2, upHi: 1.2, lp: 7000, rattle: 0.4 }) },
  { id: 'typewriter', name: 'Typewriter', type: 'other', color: '#a8873b', desc: 'เครื่องพิมพ์ดีด กด Enter มีเสียงกระดิ่ง', gain: 1,
    build: typewriter },
];
export const TYPE_NAMES = { click: 'แบบคลิก', tact: 'แบบสัมผัส', lin: 'แบบลื่น', other: 'แบบอื่น' };

/* ------------------------------------------------------------ synthesis */
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function biquad(type, f, q, sr) { // RBJ cookbook
  const w = (2 * Math.PI * Math.min(f, sr * 0.45)) / sr, c = Math.cos(w), al = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else { b0 = al; b1 = 0; b2 = -al; }
  const a0 = 1 + al;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * c) / a0, a2: (1 - al) / a0 };
}
function render(events, sr, lp, r) {
  let end = 0;
  for (const e of events) {
    if (e.noise) end = Math.max(end, e.at + e.noise.tau * 7);
    if (e.modes) for (const m of e.modes) end = Math.max(end, e.at + m[1] * 6);
  }
  const len = Math.ceil(((end + 4) / 1000) * sr), out = new Float32Array(len), att = sr * 0.00015;
  for (const e of events) {
    const s0 = Math.round((e.at / 1000) * sr);
    if (e.noise) {
      const n = e.noise, tau = (n.tau / 1000) * sr, cnt = Math.min(len - s0, Math.ceil(tau * 7)), bq = biquad('bp', n.f, n.q, sr), amp = n.amp * 2.6;
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < cnt; i++) {
        const x = (r() * 2 - 1) * Math.exp(-i / tau) * (i < att ? i / att : 1);
        const y = bq.b0 * x + bq.b1 * x1 + bq.b2 * x2 - bq.a1 * y1 - bq.a2 * y2;
        x2 = x1; x1 = x; y2 = y1; y1 = y;
        out[s0 + i] += y * amp;
      }
    }
    if (e.modes) for (const [f, tm, a] of e.modes) {
      if (f >= sr * 0.48) continue;
      const tau = (tm / 1000) * sr, cnt = Math.min(len - s0, Math.ceil(tau * 6)), w = (2 * Math.PI * f) / sr, ph = r() * 0.6;
      for (let i = 0; i < cnt; i++) out[s0 + i] += a * Math.sin(w * i + ph) * Math.exp(-i / tau) * (i < att ? i / att : 1);
    }
  }
  if (lp) { // whole-sound low-pass (dampened switches) — run twice = 24 dB/oct
    for (let pass = 0; pass < 2; pass++) {
      const bq = biquad('lp', lp, 0.707, sr); let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let i = 0; i < len; i++) { const x = out[i], y = bq.b0 * x + bq.b1 * x1 + bq.b2 * x2 - bq.a1 * y1 - bq.a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; out[i] = y; }
    }
  }
  const fade = Math.min(len, Math.round(sr * 0.004)); // no click at the end
  for (let i = 0; i < fade; i++) out[len - 1 - i] *= i / fade;
  return out;
}

/* ------------------------------------------------------------ state + audio graph */
const st = (() => { try { return { on: false, pack: 'blue', vol: 0.6, ...JSON.parse(recall(KEY, '{}')) }; } catch { return { on: false, pack: 'blue', vol: 0.6 }; } })();
if (!PACKS.some((p) => p.id === st.pack)) st.pack = 'blue';
export const sound = st;
const save = () => remember(KEY, JSON.stringify({ on: st.on, pack: st.pack, vol: st.vol }));

let ctx = null, master = null, bank = null, bankId = '', idleT = 0;
const last = {};
function graph() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC({ latencyHint: 'interactive' });
  const comp = ctx.createDynamicsCompressor(); // fast typing stacks many sounds: keep them from clipping
  comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.002; comp.release.value = 0.08;
  comp.connect(ctx.destination);
  master = ctx.createGain(); master.gain.value = curve(st.vol); master.connect(comp);
  // a small "desk" room: short stereo reverb, low in the mix, glues the clicks together
  const sr = ctx.sampleRate, n = Math.round(sr * 0.09), ir = ctx.createBuffer(2, n, sr), r = rng(7);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { lp += 0.35 * ((r() * 2 - 1) - lp); d[i] = lp * Math.exp(-i / (sr * 0.018)); } }
  const conv = ctx.createConvolver(); conv.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = 0.22;
  master.connect(conv); conv.connect(wet); wet.connect(comp);
  return ctx;
}
const curve = (v) => Math.pow(Math.max(0, Math.min(1, v)), 1.6) * 1.4; // slider feels even to the ear

// render every kind × stroke × variant of one switch into AudioBuffers (~30–60 ms, once per switch)
function makeBank(id) {
  if (bankId === id && bank) return bank;
  const p = PACKS.find((x) => x.id === id) || PACKS[0], sr = ctx.sampleRate, raw = {};
  let peak = 0, peaks = 0;
  for (const kind of Object.keys(KIND)) for (const stroke of ['down', 'up']) {
    const list = [];
    for (let v = 0; v < VARIANTS; v++) {
      const r = rng(1000 + v * 97 + kind.length * 13 + (stroke === 'up' ? 5 : 0) + id.length * 7);
      const ev = p.build(kind, stroke, r);
      if (!ev.length) continue;
      const pcm = render(ev, sr, p.build.lp || 0, r);
      list.push(pcm);
      if (kind === 'key' && stroke === 'down') { let m = 0; for (let i = 0; i < pcm.length; i++) m = Math.max(m, Math.abs(pcm[i])); peak += m; peaks++; }
    }
    raw[kind + stroke] = list;
  }
  let top = 0; // the loudest take (a space bar) must not clip
  for (const k of Object.keys(raw)) for (const pcm of raw[k]) for (let i = 0; i < pcm.length; i++) top = Math.max(top, Math.abs(pcm[i]));
  const scale = Math.min((0.5 * (p.gain || 1)) / (peak / Math.max(1, peaks) || 1), 0.9 / (top || 1));
  const out = {};
  for (const k of Object.keys(raw)) out[k] = raw[k].map((pcm) => {
    const b = ctx.createBuffer(1, pcm.length, sr), d = b.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) d[i] = Math.max(-1, Math.min(1, pcm[i] * scale));
    return b;
  });
  bank = out; bankId = id;
  return bank;
}

/* ------------------------------------------------------------ where a key sits */
const ROWS = [
  ['Escape F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12', 0, 1.05, -1],
  ['Backquote Digit1 Digit2 Digit3 Digit4 Digit5 Digit6 Digit7 Digit8 Digit9 Digit0 Minus Equal Backspace', 0, 1, 0],
  ['Tab KeyQ KeyW KeyE KeyR KeyT KeyY KeyU KeyI KeyO KeyP BracketLeft BracketRight Backslash', 0.02, 1, 1],
  ['CapsLock KeyA KeyS KeyD KeyF KeyG KeyH KeyJ KeyK KeyL Semicolon Quote Enter', 0.04, 1, 2],
  ['ShiftLeft IntlBackslash KeyZ KeyX KeyC KeyV KeyB KeyN KeyM Comma Period Slash ShiftRight', 0.03, 1, 3],
  ['ControlLeft MetaLeft AltLeft Space AltRight MetaRight ContextMenu ControlRight', 0, 1, 4],
];
const POS = {};
for (const [codes, off, span, row] of ROWS) { const a = codes.split(' '); a.forEach((c, i) => { POS[c] = [off + (i / (a.length - 1)) * (span - off) * 0.92, row]; }); }
POS.Space = [0.45, 4];
const posOf = (code) => {
  if (POS[code]) return POS[code];
  if (/^Arrow|^(Insert|Delete|Home|End|PageUp|PageDown)$/.test(code)) return [1.05, code.startsWith('Arrow') ? 4 : 1];
  if (code.startsWith('Numpad')) return [1.2, 2];
  return [0.5, 2];
};
const kindOf = (code) => code === 'Space' ? 'space' : code === 'Enter' || code === 'NumpadEnter' ? 'enter'
  : /^(Backspace|Tab|CapsLock|ShiftLeft|ShiftRight|Backslash|ControlLeft|ControlRight)$/.test(code) ? 'wide' : 'key';

/* ------------------------------------------------------------ playing */
function play(kind, stroke, code, at = 0, gainMul = 1) {
  if (!graph()) return;
  const b = makeBank(st.pack), list = b[kind + stroke] || (stroke === 'down' ? b.keydown : null);
  if (!list || !list.length) return;
  let i = (Math.random() * list.length) | 0;
  if (list.length > 1 && i === last[kind + stroke]) i = (i + 1) % list.length; // never the same take twice in a row
  last[kind + stroke] = i;
  const [x, row] = posOf(code || 'KeyG');
  const go = () => {
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource(); src.buffer = list[i];
    src.playbackRate.value = (1 + (Math.random() * 2 - 1) * 0.022) * (1 + (1.5 - Math.max(0, row)) * 0.012); // keycap rows ring a bit differently
    const g = ctx.createGain(); g.gain.value = (stroke === 'down' ? 0.86 + Math.random() * 0.28 : 0.8 + Math.random() * 0.3) * gainMul;
    let node = src.connect(g);
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-0.5, Math.min(0.5, (x - 0.48) * 0.95)); node = node.connect(p); }
    node.connect(master);
    src.start(t);
  };
  if (ctx.state !== 'running') ctx.resume().then(go, () => {}); else go();
  clearTimeout(idleT); // nothing to play for a while → let the audio thread sleep (light on the PC)
  idleT = setTimeout(() => { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); }, 6000);
}

const held = new Set();
function onDown(e) {
  if (!st.on || !e.code || e.repeat) return; // a held key auto-repeats silently, like a real keyboard
  held.add(e.code);
  play(kindOf(e.code), 'down', e.code);
}
function onUp(e) {
  if (!held.delete(e.code) || !st.on) return;
  play(kindOf(e.code), 'up', e.code);
}

/* ------------------------------------------------------------ public */
export function initKeySound() {
  addEventListener('keydown', onDown, true);
  addEventListener('keyup', onUp, true);
  addEventListener('blur', () => held.clear());
}
export function setSoundOn(on) { st.on = !!on; save(); if (on) graph(); bus.emit('keysound', st); }
export function setSoundPack(id) { if (!PACKS.some((p) => p.id === id)) return; st.pack = id; save(); bus.emit('keysound', st); }
export function setSoundVol(v) { st.vol = Math.max(0, Math.min(1, v)); save(); if (master) master.gain.setTargetAtTime(curve(st.vol), ctx.currentTime, 0.02); bus.emit('keysound', st); }
// a short typing phrase so a switch can be heard before choosing it: "print" + space + "(x)" + Enter
export function demoSound(id) {
  if (!graph()) return;
  if (id) setSoundPack(id);
  const seq = [['KeyP', 0], ['KeyR', 0.11], ['KeyI', 0.2], ['KeyN', 0.33], ['KeyT', 0.42], ['Space', 0.58], ['KeyX', 0.74], ['Enter', 0.95]];
  for (const [code, t] of seq) { play(kindOf(code), 'down', code, t); play(kindOf(code), 'up', code, t + 0.07 + Math.random() * 0.03, 0.9); }
}
// test hook: render one switch and report sizes / peaks (no sound needed)
export function soundSelfTest() {
  if (!graph()) return { ok: false, reason: 'no AudioContext' };
  const res = {};
  for (const p of PACKS) {
    const t0 = performance.now(); bank = null; const b = makeBank(p.id), ms = performance.now() - t0;
    const peak = (k) => Math.max(0, ...(b[k] || []).map((x) => { const d = x.getChannelData(0); let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i])); return +m.toFixed(3); }));
    res[p.id] = { ms: Math.round(ms), key: peak('keydown'), up: peak('keyup'), space: peak('spacedown'), enter: peak('enterdown'), len: Math.round(((b.keydown[0]?.length || 0) / ctx.sampleRate) * 1000) };
  }
  bank = null; bankId = '';
  return { ok: true, state: ctx.state, sr: ctx.sampleRate, res };
}
