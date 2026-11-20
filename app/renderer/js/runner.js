// Page side of the Python worker: one run at a time, Stop = throw the worker away and start a fresh one.
import { bus } from './core.js';

let worker = null, readyP = null, readyFlag = false, seq = 0;
const waiting = new Map();          // id -> {resolve, timer}
let queue = Promise.resolve();
export const pyInfo = { version: '', bootMs: 0, error: '' };

function spawn() {
  readyFlag = false;
  worker = new Worker(new URL('./py-worker.js', import.meta.url), { type: 'module' });
  readyP = new Promise((resolve) => {
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'ready') { readyFlag = true; pyInfo.version = m.version; pyInfo.bootMs = m.ms; pyInfo.error = ''; bus.emit('py:ready', m); resolve(true); return; }
      if (m.type === 'bootfail') { pyInfo.error = m.msg; bus.emit('py:fail', m.msg); resolve(false); return; }
      const w = waiting.get(m.id);
      if (!w) return;
      waiting.delete(m.id); clearTimeout(w.timer);
      w.resolve(m.type === 'result' ? m.res : { ok: false, error: { type: 'Internal', msg: m.msg, line: null, tb: [] }, out: [], steps: [], files: {} });
    };
    worker.onerror = (e) => { pyInfo.error = String(e.message || e); bus.emit('py:fail', pyInfo.error); resolve(false); };
  });
}
spawn();

export const pyReady = () => readyP;
export const isPyReady = () => readyFlag;

// Stop whatever is running (endless loop, huge output…). Python restarts in the background (~1–2 s).
export function stopPython() {
  for (const [, w] of waiting) { clearTimeout(w.timer); w.resolve({ ok: false, stopped: true, error: { type: 'Stopped', msg: '', line: null, tb: [] }, out: [], steps: [], files: {} }); }
  waiting.clear();
  try { worker.terminate(); } catch { /* */ }
  spawn();
}

// req: {code, stdin, files, trace, sample, seed, maxRecord, maxSteps, maxSecs}
export function runPython(req) {
  const job = queue.then(async () => {
    await readyP;
    const id = ++seq;
    return new Promise((resolve) => {
      const limit = ((req.maxSecs || 12) + 8) * 1000;
      const timer = setTimeout(() => {            // stuck inside one C call (e.g. a giant string): kill it
        if (!waiting.has(id)) return;
        waiting.delete(id);
        try { worker.terminate(); } catch { /* */ }
        spawn();
        resolve({ ok: false, error: { type: 'TooSlow', msg: String(req.maxSecs || 12), line: null, tb: [] }, out: [], steps: [], files: {} });
      }, limit);
      waiting.set(id, { resolve, timer });
      worker.postMessage({ id, req });
    });
  });
  queue = job.catch(() => {});
  return job;
}

export const isBusy = () => waiting.size > 0;
