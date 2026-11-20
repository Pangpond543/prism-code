// Prism Code — Python lives here (Pyodide, offline), off the page thread so a long program never freezes the window.
// Messages in:  {id, req}  where req = {code, stdin, files, trace, sample, seed, maxRecord, maxSteps, maxSecs}
// Messages out: {type:'ready', ms, version} · {type:'result', id, res} · {type:'fail', id, msg}
import { loadPyodide } from '../pyodide/pyodide.mjs';

let run = null;
const t0 = performance.now();

async function boot() {
  try {
    const py = await loadPyodide({ indexURL: new URL('../pyodide/', import.meta.url).href, stdout: () => {}, stderr: () => {} });
    const src = await (await fetch(new URL('../py/tracer.py', import.meta.url))).text();
    py.runPython(src);
    run = py.globals.get('prism_run');
    const version = py.runPython('import sys; sys.version.split()[0]');
    postMessage({ type: 'ready', ms: Math.round(performance.now() - t0), version });
  } catch (e) {
    postMessage({ type: 'bootfail', msg: String(e && (e.stack || e.message) || e) });
  }
}
const ready = boot();

onmessage = async (e) => {
  const { id, req } = e.data;
  await ready;
  if (!run) { postMessage({ type: 'fail', id, msg: 'python not loaded' }); return; }
  try {
    const res = JSON.parse(run(JSON.stringify(req)));
    postMessage({ type: 'result', id, res });
  } catch (err) {
    postMessage({ type: 'fail', id, msg: String(err && err.message || err) });
  }
};
