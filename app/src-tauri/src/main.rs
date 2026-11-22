// Prism Code — learn Python by watching it run. The whole app is the page in app/renderer (embedded in the exe):
// CodeMirror editor, Pyodide (Python 3.14 compiled to WebAssembly, offline) in a web worker, the step-by-step stage.
// Rust only provides the Prism shell (window buttons, About/update), file dialogs, reading / saving .py / .ipynb /
// .txt files from the PC, drag & drop, the log and the PRISM_ACT test hook.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(non_snake_case)]

mod update;

use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::OnceLock;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

const PKG_NAME: &str = "prism-code"; // app/package.json "name" — the updater refuses anything else
const MAX_FILE: u64 = 5 * 1024 * 1024;
static APP: OnceLock<AppHandle> = OnceLock::new();

fn wide(s: &str) -> Vec<u16> { s.encode_utf16().chain(std::iter::once(0)).collect() }
fn now_ms() -> u128 { std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0) }
fn log_path() -> PathBuf { PathBuf::from(std::env::var("LOCALAPPDATA").unwrap_or_default()).join("com.prism.code").join("prism.log") }
fn log(s: &str) {
    use std::io::Write;
    let p = log_path();
    if let Some(d) = p.parent() { let _ = std::fs::create_dir_all(d); }
    if std::fs::metadata(&p).map(|m| m.len() > 400_000).unwrap_or(false) { let _ = std::fs::remove_file(&p); }
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&p) { let _ = writeln!(f, "[{}] {s}", now_ms()); }
}

fn app_dir() -> PathBuf {
    let exe_dir = std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.to_path_buf())).unwrap_or_default();
    if exe_dir.join("prism.config.json").exists() { return exe_dir; }
    if let Some(up) = exe_dir.parent() { if up.join("prism.config.json").exists() { return up.to_path_buf(); } }
    let src = PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().map(|p| p.to_path_buf()).unwrap_or_default();
    if src.join("prism.config.json").exists() { src } else { exe_dir }
}
fn repo() -> String {
    let cfg: Value = std::fs::read_to_string(app_dir().join("prism.config.json")).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or(Value::Null);
    let r = cfg["repo"].as_str().unwrap_or("").trim();
    let r = r.trim_start_matches("https://github.com/").trim_end_matches(".git").trim_matches('/');
    if update::valid_repo(r) { r.to_string() } else { String::new() }
}
fn main_win() -> Option<WebviewWindow> { APP.get().and_then(|a| a.get_webview_window("main")) }

/* ------------------------------------------------------------ shell */
#[tauri::command]
fn app_log(a: String) { log(&a.chars().take(600).collect::<String>()); }
#[tauri::command]
fn win_min(window: WebviewWindow) { let _ = window.minimize(); }
#[tauri::command]
fn win_max(window: WebviewWindow) { let _ = if window.is_maximized().unwrap_or(false) { window.unmaximize() } else { window.maximize() }; }
#[tauri::command]
fn win_close(app: AppHandle) { log("quit"); app.exit(0); }
#[tauri::command]
fn app_ready(window: WebviewWindow) { let _ = window.show(); let _ = window.set_focus(); log("page ready"); }
#[tauri::command]
fn app_relaunch(app: AppHandle) {
    // installed copy after an update: hand over to the new installer (silent; it starts Prism Code again when done)
    if let Some(setup) = PENDING_SETUP.lock().ok().and_then(|mut p| p.take()) {
        if setup.exists() && std::process::Command::new(&setup).arg("/S").arg("/RELAUNCH").spawn().is_ok() { app.exit(0); return; }
    }
    app.restart();
}
static PENDING_SETUP: std::sync::Mutex<Option<PathBuf>> = std::sync::Mutex::new(None);
fn exe_dir() -> PathBuf { std::env::current_exe().ok().and_then(|p| p.parent().map(|p| p.to_path_buf())).unwrap_or_default() }
#[tauri::command]
fn app_args() -> Value {
    // files passed on the command line ("Open with" / drag onto the exe)
    Value::Array(std::env::args().skip(1).filter(|a| !a.starts_with('-') && std::path::Path::new(a).is_file()).map(Value::String).collect())
}
#[tauri::command]
fn about_info() -> Value {
    json!({ "version": env!("CARGO_PKG_VERSION"), "repo": repo(), "tauri": tauri::VERSION, "test": std::env::var("PRISM_ACT").unwrap_or_default() })
}
#[tauri::command]
fn about_openRepo() { let r = repo(); if !r.is_empty() { let _ = std::process::Command::new("explorer").arg(format!("https://github.com/{r}")).spawn(); } }
#[tauri::command(async)]
fn update_check() -> Value { update::check(&repo(), env!("CARGO_PKG_VERSION")) }
#[tauri::command(async)]
fn update_apply(app: AppHandle) -> Value {
    let c = update::check(&repo(), env!("CARGO_PKG_VERSION"));
    if c["ok"] != true { return c; }
    if c["hasUpdate"] != true { return json!({ "ok": false, "reason": "uptodate" }); }
    if !app_dir().join("src-tauri").exists() { // packaged (installer / portable): use the files on the GitHub release
        let (r, setup) = update::apply_release(&c, &exe_dir(), &|step| { let _ = app.emit("update:step", json!({ "step": step, "f": 0 })); });
        if let (Some(s), Ok(mut p)) = (setup, PENDING_SETUP.lock()) { *p = Some(s); }
        log(&format!("UPDATE kind={} result={}", update::packaged_kind(&exe_dir()), r));
        return r;
    }
    update::apply(c["zip"].as_str().unwrap_or(""), &app_dir(), PKG_NAME, &|step| { let _ = app.emit("update:step", json!({ "step": step, "f": 0 })); })
}

/* ------------------------------------------------------------ files */
fn read_text(path: &std::path::Path) -> Value {
    let name = path.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default();
    let meta = match std::fs::metadata(path) { Ok(m) => m, Err(_) => return json!({ "ok": false, "reason": "missing", "name": name }) };
    if meta.len() > MAX_FILE { return json!({ "ok": false, "reason": "big", "name": name }); }
    match std::fs::read(path) {
        Ok(b) => {
            // UTF-8 (with or without BOM); old Thai Windows files (TIS-620 / cp874) are converted
            let b = if b.starts_with(&[0xEF, 0xBB, 0xBF]) { b[3..].to_vec() } else { b };
            let text = match String::from_utf8(b.clone()) { Ok(s) => s, Err(_) => b.iter().map(|&c| if c >= 0xA1 && c <= 0xFB { char::from_u32(0x0E01 + (c as u32 - 0xA1)).unwrap_or('?') } else { c as char }).collect() };
            json!({ "ok": true, "text": text.replace("\r\n", "\n"), "name": name, "size": meta.len(), "path": path.to_string_lossy() })
        }
        Err(_) => json!({ "ok": false, "reason": "read", "name": name }),
    }
}
#[tauri::command(async)]
fn fs_read(a: String) -> Value { let v = read_text(std::path::Path::new(&a)); log(&format!("read {a} ok={}", v["ok"])); v }
#[tauri::command(async)]
fn fs_write(a: Value) -> Value {
    let path = a["path"].as_str().unwrap_or("");
    let text = a["text"].as_str().unwrap_or("");
    if path.is_empty() { return json!({ "ok": false }); }
    // Windows line endings, like Notepad / VS Code on Windows would save
    let ok = std::fs::write(path, text.replace("\r\n", "\n").replace('\n', "\r\n")).is_ok();
    log(&format!("write {path} ok={ok}"));
    json!({ "ok": ok })
}
/// Text files next to an opened .py / .ipynb (what open("data.txt") would find when run in that folder).
#[tauri::command(async)]
fn fs_list(a: String) -> Value {
    let mut out = vec![];
    if let Ok(rd) = std::fs::read_dir(&a) {
        for e in rd.flatten() {
            let p = e.path();
            let ext = p.extension().map(|x| x.to_string_lossy().to_lowercase()).unwrap_or_default();
            if !p.is_file() || !["txt", "csv", "dat"].contains(&ext.as_str()) { continue; }
            let size = e.metadata().map(|m| m.len()).unwrap_or(0);
            if size > 1_000_000 { continue; }
            out.push(json!({ "name": p.file_name().map(|n| n.to_string_lossy().to_string()).unwrap_or_default(), "path": p.to_string_lossy(), "size": size }));
        }
    }
    Value::Array(out)
}

/* ------------------------------------------------------------ dialogs */
fn en() -> bool {
    // the page keeps the language in localStorage; the dialogs follow the last one it told us
    LANG_EN.load(std::sync::atomic::Ordering::Relaxed)
}
static LANG_EN: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
#[tauri::command]
fn app_lang(a: String) { LANG_EN.store(a == "en", std::sync::atomic::Ordering::Relaxed); }
fn tr<'a>(th: &'a str, en_s: &'a str) -> &'a str { if en() { en_s } else { th } }

unsafe fn dialog(save: bool, kind: &str, name: &str) -> Option<String> {
    use windows::core::{Interface, PCWSTR};
    use windows::Win32::System::Com::*;
    use windows::Win32::UI::Shell::Common::COMDLG_FILTERSPEC;
    use windows::Win32::UI::Shell::*;
    let _ = CoInitializeEx(None, COINIT_APARTMENTTHREADED);
    let filters: Vec<(String, &str)> = match kind {
        "code" => vec![(tr("ไฟล์ Python / Notebook", "Python / Notebook").into(), "*.py;*.ipynb;*.txt"), (tr("ทุกไฟล์", "All files").into(), "*.*")],
        "py" => vec![(tr("ไฟล์ Python", "Python file").into(), "*.py"), (tr("ทุกไฟล์", "All files").into(), "*.*")],
        _ => vec![(tr("ไฟล์ข้อความ", "Text files").into(), "*.txt;*.csv;*.dat"), (tr("ทุกไฟล์", "All files").into(), "*.*")],
    };
    let names: Vec<Vec<u16>> = filters.iter().map(|(n, _)| wide(n)).collect();
    let specs: Vec<Vec<u16>> = filters.iter().map(|(_, s)| wide(s)).collect();
    let f: Vec<COMDLG_FILTERSPEC> = names.iter().zip(&specs).map(|(n, s)| COMDLG_FILTERSPEC { pszName: PCWSTR(n.as_ptr()), pszSpec: PCWSTR(s.as_ptr()) }).collect();
    let owner = main_win().and_then(|w| w.hwnd().ok()).map(|h| windows::Win32::Foundation::HWND(h.0 as _));
    let d: IFileDialog = if save {
        let d: IFileSaveDialog = CoCreateInstance(&FileSaveDialog, None, CLSCTX_INPROC_SERVER).ok()?;
        d.cast().ok()?
    } else {
        let d: IFileOpenDialog = CoCreateInstance(&FileOpenDialog, None, CLSCTX_INPROC_SERVER).ok()?;
        d.cast().ok()?
    };
    let o = d.GetOptions().ok()?;
    let pick_dir = kind == "dir";
    d.SetOptions(o | FOS_FORCEFILESYSTEM | if save { FOS_OVERWRITEPROMPT } else if pick_dir { FOS_PICKFOLDERS } else { FOS_FILEMUSTEXIST }).ok()?;
    if !pick_dir { let _ = d.SetFileTypes(&f); }
    if save {
        let n = wide(name);
        let _ = d.SetFileName(PCWSTR(n.as_ptr()));
        let ext = std::path::Path::new(name).extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_else(|| "txt".into());
        let e = wide(&ext);
        let _ = d.SetDefaultExtension(PCWSTR(e.as_ptr()));
        if ext.eq_ignore_ascii_case("py") { let _ = d.SetFileTypeIndex(1); }
    }
    d.Show(owner).ok()?;
    let it = d.GetResult().ok()?;
    let p = it.GetDisplayName(SIGDN_FILESYSPATH).ok()?;
    let s = p.to_string().ok();
    CoTaskMemFree(Some(p.0 as _));
    s
}
#[tauri::command(async)]
fn pick_open(a: String) -> Value { match unsafe { dialog(false, &a, "") } { Some(p) => Value::String(p), None => Value::Null } }
#[tauri::command(async)]
fn pick_save(a: String) -> Value {
    let kind = if a.to_lowercase().ends_with(".py") { "py" } else { "data" };
    match unsafe { dialog(true, kind, &a) } { Some(p) => Value::String(p), None => Value::Null }
}

/// Folder picker (save a whole library folder as .py files).
#[tauri::command(async)]
fn pick_dir() -> Value { match unsafe { dialog(false, "dir", "") } { Some(p) => Value::String(p), None => Value::Null } }
/// Writes several files under a folder: {dir, files:[{rel, text}]}. rel may contain sub-folders ("a/b.py");
/// "..", drive letters and empty parts are refused so nothing lands outside the chosen folder.
#[tauri::command(async)]
fn fs_write_tree(a: Value) -> Value {
    let dir = std::path::PathBuf::from(a["dir"].as_str().unwrap_or(""));
    if !dir.is_dir() { return json!({ "ok": false, "written": 0 }); }
    let mut n = 0;
    for f in a["files"].as_array().cloned().unwrap_or_default() {
        let rel = f["rel"].as_str().unwrap_or("");
        let parts: Vec<&str> = rel.split(['/', '\\']).collect();
        if parts.iter().any(|p| p.is_empty() || *p == ".." || *p == "." || p.contains(':')) { continue; }
        let mut p = dir.clone();
        for x in &parts { p.push(x); }
        if let Some(parent) = p.parent() { let _ = std::fs::create_dir_all(parent); }
        let text = f["text"].as_str().unwrap_or("");
        if std::fs::write(&p, text.replace("\r\n", "\n").replace('\n', "\r\n")).is_ok() { n += 1; }
    }
    log(&format!("write tree {} files={n}", dir.display()));
    json!({ "ok": true, "written": n })
}

/* ------------------------------------------------------------ single instance */
fn single_instance() -> bool {
    use windows::Win32::Foundation::*;
    use windows::Win32::System::Threading::CreateMutexW;
    use windows::Win32::UI::WindowsAndMessaging::*;
    unsafe {
        let name = wide("Local\\PrismCode.single");
        let m = CreateMutexW(None, true, windows::core::PCWSTR(name.as_ptr()));
        if GetLastError() == ERROR_ALREADY_EXISTS {
            let t = wide("Prism Code");
            if let Ok(h) = FindWindowW(windows::core::PCWSTR::null(), windows::core::PCWSTR(t.as_ptr())) {
                let _ = ShowWindow(h, SW_RESTORE);
                let _ = SetForegroundWindow(h);
            }
            return false;
        }
        std::mem::forget(m);
    }
    true
}

/* ------------------------------------------------------------ white-page recovery */
/// If the page's process crashes or hangs (out of memory, GPU driver reset…) WebView2 leaves the window white for
/// good. Log what happened and reload the page; if the whole WebView2 is gone, restart the app. Work is saved
/// to localStorage 0.4 s after every change, so a reload loses at most the last keystrokes.
fn watch_page(w: &WebviewWindow) {
    let _ = w.with_webview(|wv| unsafe {
        use webview2_com::Microsoft::Web::WebView2::Win32::*;
        let Ok(core) = wv.controller().CoreWebView2() else { return };
        let handler = webview2_com::ProcessFailedEventHandler::create(Box::new(|sender, args| {
            let Some(args) = args else { return Ok(()) };
            let mut kind = COREWEBVIEW2_PROCESS_FAILED_KIND::default();
            args.ProcessFailedKind(&mut kind)?;
            let name = match kind {
                COREWEBVIEW2_PROCESS_FAILED_KIND_BROWSER_PROCESS_EXITED => "browser exited",
                COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_EXITED => "page exited",
                COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_UNRESPONSIVE => "page not responding",
                COREWEBVIEW2_PROCESS_FAILED_KIND_GPU_PROCESS_EXITED => "gpu exited",
                _ => "other",
            };
            static COUNT: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(0);
            let n = COUNT.fetch_add(1, std::sync::atomic::Ordering::SeqCst) + 1;
            log(&format!("WEBVIEW FAILED: {name} (#{n})"));
            if kind == COREWEBVIEW2_PROCESS_FAILED_KIND_BROWSER_PROCESS_EXITED {
                if let Some(a) = APP.get() { a.restart(); }
            } else if (kind == COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_EXITED || kind == COREWEBVIEW2_PROCESS_FAILED_KIND_RENDER_PROCESS_UNRESPONSIVE) && n <= 5 {
                if let Some(s) = sender { let _ = s.Reload(); } // after 5 tries in one session leave it (and the log) alone
            }
            Ok(())
        }));
        let mut token = Default::default();
        let _ = core.add_ProcessFailed(&handler, &mut token);
    });
}

fn main() {
    if std::env::var("PRISM_MULTI").is_err() && !single_instance() { return; }
    std::panic::set_hook(Box::new(|i| log(&format!("PANIC {i}"))));
    update::clean_old(&exe_dir());
    {
        let exe = std::env::current_exe().unwrap_or_default();
        let mt = std::fs::metadata(&exe).and_then(|m| m.modified()).ok().and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok()).map(|d| d.as_secs()).unwrap_or(0);
        log(&format!("START v{} exe={} exe_mtime={} act={:?}", env!("CARGO_PKG_VERSION"), exe.display(), mt, std::env::var("PRISM_ACT").ok()));
    }
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            app_log, win_min, win_max, win_close, app_ready, app_relaunch, app_args, app_lang, about_info, about_openRepo, update_check, update_apply,
            fs_read, fs_write, fs_list, pick_open, pick_save, pick_dir, fs_write_tree
        ])
        .setup(|app| {
            let _ = APP.set(app.handle().clone());
            if let Some(w) = app.get_webview_window("main") { watch_page(&w); }
            // the window shows itself when the page is ready; never stay invisible if the page fails
            std::thread::spawn(|| { std::thread::sleep(std::time::Duration::from_secs(6)); if let Some(w) = main_win() { if !w.is_visible().unwrap_or(true) { log("page not ready after 6 s — showing window"); let _ = w.show(); } } });
            Ok(())
        })
        .on_window_event(|w, e| {
            match e {
                tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, .. }) => {
                    let _ = w.app_handle().emit("code:dragover", false);
                    let _ = w.app_handle().emit("code:drop", json!({ "paths": paths.iter().map(|p| p.to_string_lossy().to_string()).collect::<Vec<_>>() }));
                }
                tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Enter { .. }) => { let _ = w.app_handle().emit("code:dragover", true); }
                tauri::WindowEvent::DragDrop(tauri::DragDropEvent::Leave) => { let _ = w.app_handle().emit("code:dragover", false); }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Prism Code");
}
