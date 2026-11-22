# Prism Code — runs the learner's program inside Pyodide and records every step for the animation.
# Called from py-worker.js:  prism_run(json_request) -> json_result
#
# One run = fresh namespace + fresh /work folder filled with the given files. input() takes values from the
# given stdin list; when it runs out the run stops with "need_input" and the page asks the user, then runs the
# whole program again with one more value (programs are deterministic: random is seeded the same each time).
import sys, ast, json, builtins, io, os, time, random, types, traceback, shutil

USER = "<prism>"
WORK = "/work"
OUT_MAX = 200000       # characters of program output kept
SER_MAX = 400000       # values serialised for the step picture (~10 MB of JSON; a 60×60 list × 2500 steps was 220 MB → white page)
STACK_MAX = 24        # call frames copied into each step
TB_MAX = 12           # traceback frames kept (a RecursionError has ~1000)
_real_open = builtins.open
_real_input = builtins.input


class NeedInput(BaseException):
    def __init__(self, prompt):
        self.prompt = prompt


class TooManySteps(BaseException):
    pass


class TooSlow(BaseException):
    pass


# ----------------------------------------------------------------------------- static info per line
def _seg(code, node):
    try:
        s = ast.get_source_segment(code, node)
        if s is not None:
            return s
    except Exception:
        pass
    try:
        return ast.unparse(node)
    except Exception:
        return ""


def _no_calls(node):
    for n in ast.walk(node):
        if isinstance(n, (ast.Call, ast.Await, ast.Yield, ast.YieldFrom, ast.NamedExpr)):
            return False
    return True


def line_info(code, tree):
    """Per statement start line: names read / written, and a short description used for the narration."""
    info = {}

    def get(ln):
        return info.setdefault(ln, {"loads": [], "stores": []})

    for st in ast.walk(tree):
        if not isinstance(st, ast.stmt):
            continue
        d = get(st.lineno)
        d.setdefault("end", getattr(st, "end_lineno", st.lineno))
        for field, val in ast.iter_fields(st):
            if field in ("body", "orelse", "finalbody", "handlers", "cases"):
                continue
            vals = val if isinstance(val, list) else [val]
            for v in vals:
                if not isinstance(v, ast.AST) or isinstance(v, ast.stmt):
                    continue
                for n in ast.walk(v):
                    if isinstance(n, ast.Name):
                        key = "stores" if isinstance(n.ctx, (ast.Store, ast.Del)) else "loads"
                        if n.id not in d[key]:
                            d[key].append(n.id)
                    # simple reads like parts[1], water_list[i], nums[-1]: the animation flies that one cell
                    elif isinstance(n, ast.Subscript) and isinstance(n.ctx, ast.Load) and isinstance(n.value, ast.Name) and _no_calls(n.slice):
                        sl = n.slice
                        idx = None
                        if isinstance(sl, ast.Constant) and isinstance(sl.value, int):
                            idx = sl.value
                        elif isinstance(sl, ast.UnaryOp) and isinstance(sl.op, ast.USub) and isinstance(sl.operand, ast.Constant) and isinstance(sl.operand.value, int):
                            idx = -sl.operand.value
                        if isinstance(sl, (ast.Constant, ast.Name, ast.UnaryOp, ast.BinOp)):
                            subs = d.setdefault("subs", [])
                            src = _seg(code, n)
                            if len(subs) < 8 and all(s["src"] != src for s in subs):
                                subs.append({"src": src, "base": n.value.id, "idx": idx, "ix": _seg(code, sl)})
        k = None
        if isinstance(st, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
            k = "assign"
            d["expr"] = _seg(code, st.value) if st.value is not None else ""
            tg = st.targets if isinstance(st, ast.Assign) else [st.target]
            d["targets"] = [_seg(code, t) for t in tg]
            if isinstance(st, ast.AugAssign):
                d["op"] = type(st.op).__name__
            d["call"] = not _no_calls(st.value) if st.value is not None else False
        elif isinstance(st, ast.If):
            k = "if"
            d["test"] = _seg(code, st.test)
            d["safe"] = _no_calls(st.test)
            d["body"] = [st.body[0].lineno, st.body[-1].end_lineno]
            d["orelse"] = st.orelse[0].lineno if st.orelse else None
            d["elif"] = False
        elif isinstance(st, ast.While):
            k = "while"
            d["test"] = _seg(code, st.test)
            d["safe"] = _no_calls(st.test)
            d["body"] = [st.body[0].lineno, st.body[-1].end_lineno]
        elif isinstance(st, ast.For):
            k = "for"
            d["target"] = _seg(code, st.target)
            d["iter"] = _seg(code, st.iter)
            d["body"] = [st.body[0].lineno, st.body[-1].end_lineno]
        elif isinstance(st, ast.FunctionDef):
            k = "def"
            d["name"] = st.name
            d["params"] = [a.arg for a in st.args.args]
            d["body"] = [st.body[0].lineno, st.body[-1].end_lineno]
        elif isinstance(st, ast.Return):
            k = "return"
            d["expr"] = _seg(code, st.value) if st.value is not None else ""
        elif isinstance(st, ast.Expr):
            k = "expr"
            d["expr"] = _seg(code, st.value)
        elif isinstance(st, (ast.Import, ast.ImportFrom)):
            k = "import"
        elif isinstance(st, ast.With):
            k = "with"
            d["expr"] = _seg(code, st)
        if k and "kind" not in d:
            d["kind"] = k
    # mark "elif" headers (an If that is the only statement of the parent's orelse)
    for st in ast.walk(tree):
        if isinstance(st, ast.If) and len(st.orelse) == 1 and isinstance(st.orelse[0], ast.If):
            sub = st.orelse[0]
            if sub.lineno in info:
                # source text decides: "elif" keyword sits at the same column as the parent "if"
                lines = code.splitlines()
                if sub.lineno - 1 < len(lines) and lines[sub.lineno - 1].lstrip().startswith("elif"):
                    info[sub.lineno]["elif"] = True
    return info


def call_args(code, tree, line, fname):
    """Source text of the arguments of the first call to `fname` on `line` (for the arg → parameter animation)."""
    for n in ast.walk(tree):
        if isinstance(n, ast.Call) and getattr(n, "lineno", 0) <= line <= getattr(n, "end_lineno", 0):
            f = n.func
            nm = f.id if isinstance(f, ast.Name) else (f.attr if isinstance(f, ast.Attribute) else None)
            if nm == fname:
                out = []
                for a in n.args:
                    out.append({"src": _seg(code, a), "name": a.id if isinstance(a, ast.Name) else None})
                for kw in n.keywords:
                    out.append({"src": _seg(code, kw.value), "name": kw.value.id if isinstance(kw.value, ast.Name) else None, "kw": kw.arg})
                return out
    return []


# ----------------------------------------------------------------------------- values → JSON
class Ser:
    def __init__(self):
        self.ids = {}
        self.n = 0             # values serialised so far (a run with huge lists stops recording, not the PC)

    def oid(self, v):
        k = id(v)
        if k not in self.ids:
            self.ids[k] = len(self.ids) + 1
        return self.ids[k]

    def __call__(self, v, depth=0):
        t = type(v)
        self.n += 1
        try:
            if v is None:
                return {"t": "None", "r": "None"}
            if t is bool:
                return {"t": "bool", "r": repr(v)}
            if t is int:
                r = repr(v)
                return {"t": "int", "r": r if len(r) < 60 else r[:56] + "…"}
            if t is float:
                return {"t": "float", "r": repr(v)}
            if t is str:
                r = repr(v)
                return {"t": "str", "r": r if len(r) <= 240 else r[:236] + "…'"}
            if t in (list, tuple, set, frozenset):
                seq = list(v) if t is not set else sorted(v, key=repr)
                if depth >= 2:
                    return {"t": t.__name__, "r": "[…]" if t is list else "(…)", "n": len(seq)}
                return {"t": t.__name__, "id": self.oid(v), "n": len(seq), "items": [self(x, depth + 1) for x in seq[:60]]}
            if t is dict:
                if depth >= 2:
                    return {"t": "dict", "r": "{…}", "n": len(v)}
                its = list(v.items())[:40]
                return {"t": "dict", "id": self.oid(v), "n": len(v), "keys": [self(k, depth + 1) for k, _ in its], "items": [self(x, depth + 1) for _, x in its]}
            if isinstance(v, PrismFile):
                return {"t": "file", "r": "<file '%s' mode '%s'%s>" % (v._pname, v._pmode, " closed" if v.closed else ""), "name": v._pname, "mode": v._pmode, "closed": v.closed}
            if isinstance(v, (types.FunctionType, types.LambdaType)):
                return {"t": "func", "r": "function %s()" % v.__name__, "name": v.__name__}
            if isinstance(v, type):
                return {"t": "class", "r": "class %s" % v.__name__}
            if isinstance(v, (types.BuiltinFunctionType, types.BuiltinMethodType)):
                return {"t": "builtin", "r": "%s()" % getattr(v, "__name__", "?")}
            if isinstance(v, range):
                return {"t": "range", "r": repr(v)}
            r = repr(v)
            return {"t": t.__name__, "r": r if len(r) < 160 else r[:156] + "…"}
        except Exception:
            return {"t": t.__name__, "r": "<%s>" % t.__name__}


# ----------------------------------------------------------------------------- files
class PrismFile:
    """Wraps a real file so reads / writes show up in the animation. Behaves like the normal file object."""

    def __init__(self, f, name, mode, run):
        self._f = f
        self._pname = name
        self._pmode = mode
        self._run = run

    def _ev(self, op, text=""):
        self._run.fx({"k": "file", "op": op, "f": self._pname, "mode": self._pmode, "text": text[:4000]})

    def write(self, s):
        n = self._f.write(s)
        self._ev("write", str(s))
        return n

    def writelines(self, lines):
        lines = list(lines)
        self._f.writelines(lines)
        self._ev("write", "".join(str(x) for x in lines))

    def read(self, *a):
        s = self._f.read(*a)
        self._ev("read", s if isinstance(s, str) else "")
        return s

    def readline(self, *a):
        s = self._f.readline(*a)
        self._ev("read", s if isinstance(s, str) else "")
        return s

    def readlines(self, *a):
        s = self._f.readlines(*a)
        self._ev("read", "".join(s))
        return s

    def __iter__(self):
        return self

    def __next__(self):
        s = self._f.readline()
        if not s:
            raise StopIteration
        self._ev("read", s)
        return s

    def close(self):
        if not self._f.closed:
            self._f.close()
            self._ev("close")

    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.close()
        return False

    @property
    def closed(self):
        return self._f.closed

    @property
    def name(self):
        return self._pname

    @property
    def mode(self):
        return self._pmode

    def __getattr__(self, k):
        return getattr(self._f, k)

    def __repr__(self):
        return "<_io.TextIOWrapper name='%s' mode='%s' encoding='utf-8'>" % (self._pname, self._pmode)


# ----------------------------------------------------------------------------- one run
class Run:
    def __init__(self, req):
        self.code = req.get("code", "")
        self.stdin = list(req.get("stdin", []))
        self.sample = req.get("sample")          # sample console text: input() answers are taken from it
        self.sample_pos = 0
        self.trace = bool(req.get("trace", True))
        self.max_rec = int(req.get("maxRecord", 2500))
        self.max_steps = int(req.get("maxSteps", 1500000))
        self.max_secs = float(req.get("maxSecs", 12))
        self.out = []          # [kind, text, step]  kind: out | err | in
        self.out_len = 0
        self.out_cut = False   # more than OUT_MAX characters printed: the rest is dropped (and the page says so)
        self.steps = []
        self.pending = []      # effects that happened since the last recorded step
        self.count = 0
        self.t0 = time.time()
        self.frames = {}       # id(frame) -> small int
        self.next_fid = 1
        self.ser = Ser()
        self.truncated = False
        self.stack = []        # user frames, outermost first
        self.inputs_used = []
        self.tree = None
        self.info = {}
        self.ns = None

    # effects ---------------------------------------------------------------
    def fx(self, e):
        if len(self.steps) < self.max_rec:
            self.pending.append(e)

    def emit(self, kind, text):
        if not text:
            return
        if self.out_len >= OUT_MAX:
            self.out_cut = True
            return
        if self.out_len + len(text) > OUT_MAX:   # one giant print("x" * 10**8) must not reach the page whole
            text = text[: OUT_MAX - self.out_len]
            self.out_cut = True
        self.out_len += len(text)
        if self.out and self.out[-1][0] == kind and self.out[-1][2] == len(self.steps):
            self.out[-1][1] += text
        else:
            self.out.append([kind, text, len(self.steps)])
        if kind != "err":
            self.fx({"k": "in" if kind == "in" else "out", "text": text[:2000]})

    # input -----------------------------------------------------------------
    def _input(self, prompt=""):
        prompt = "" if prompt is None else str(prompt)
        self.emit("prompt", prompt)
        if self.stdin:
            v = self.stdin.pop(0)
        elif self.sample is not None:
            v = self._from_sample(prompt)
            if v is None:
                raise NeedInput(prompt)
        else:
            raise NeedInput(prompt)
        v = str(v)
        self.inputs_used.append(v)
        self.emit("in", v + "\n")
        return v

    def _from_sample(self, prompt):
        p = prompt.strip()
        lines = self.sample.split("\n")
        for i in range(self.sample_pos, len(lines)):
            ln = lines[i]
            if p and ln.strip().startswith(p):
                self.sample_pos = i + 1
                return ln.strip()[len(p):].strip()
            if not p and ln.strip():
                self.sample_pos = i + 1
                return ln.strip()
        return None

    # open ------------------------------------------------------------------
    def _open(self, file, mode="r", *a, **kw):
        name = os.fspath(file) if not isinstance(file, int) else file
        if "b" not in mode and "encoding" not in kw and not (a and len(a) >= 2):
            kw["encoding"] = "utf-8"
        f = _real_open(file, mode, *a, **kw)
        if "b" in mode:
            return f
        pf = PrismFile(f, str(name), mode, self)
        self.fx({"k": "file", "op": "open", "f": str(name), "mode": mode, "text": ""})
        return pf

    # tracing ---------------------------------------------------------------
    def fid(self, frame):
        k = id(frame)
        if k not in self.frames:
            self.frames[k] = self.next_fid
            self.next_fid += 1
        return self.frames[k]

    def snap_vars(self, frame, is_module):
        d = frame.f_globals if is_module else frame.f_locals
        out = []
        for k, v in list(d.items()):
            if k.startswith("__") or isinstance(v, types.ModuleType):
                continue
            if is_module and k in ("prism_run",):
                continue
            out.append([k, self.ser(v)])
        return out

    def record(self, ev, frame, extra=None):
        if len(self.steps) >= self.max_rec or self.ser.n > SER_MAX:
            self.truncated = True
            return
        stack = []
        frames = self.stack
        if len(frames) > STACK_MAX:  # deep recursion: the global frame + the innermost calls (else every step copies 1000 frames)
            frames = frames[:1] + frames[-(STACK_MAX - 1):]
        for fr in frames:
            is_mod = fr.f_code.co_name == "<module>"
            stack.append({
                "id": self.fid(fr),
                "fn": "Global" if is_mod else fr.f_code.co_name,
                "ln": fr.f_lineno,
                "vars": self.snap_vars(fr, is_mod),
            })
        st = {"ev": ev, "ln": frame.f_lineno, "fid": self.fid(frame), "stack": stack, "fx": self.pending}
        if extra:
            st.update(extra)
        self.pending = []
        self.steps.append(st)

    def tick(self):
        self.count += 1
        if self.count > self.max_steps:
            raise TooManySteps()
        if (self.count & 8191) == 0 and time.time() - self.t0 > self.max_secs:
            raise TooSlow()

    def tracer(self, frame, event, arg):
        if frame.f_code.co_filename != USER:
            return None
        name = frame.f_code.co_name
        if name.startswith("<") and name != "<module>":
            return None  # generator expressions / comprehensions: part of their line
        if event == "call":
            self.stack.append(frame)
            if name != "<module>" and self.trace:
                caller = frame.f_back
                args = []
                if caller is not None and caller.f_code.co_filename == USER:
                    args = call_args(self.code, self.tree, caller.f_lineno, name)
                code = frame.f_code
                params = list(code.co_varnames[: code.co_argcount + code.co_kwonlyargcount])
                self.tick()
                self.record("call", frame, {"callee": name, "params": params, "args": args,
                                            "from": self.fid(caller) if caller is not None and caller.f_code.co_filename == USER else None,
                                            "fromLn": caller.f_lineno if caller is not None else None})
            return self.tracer
        if event == "line":
            self.tick()
            if self.trace and len(self.steps) < self.max_rec:
                extra = None
                li = self.info.get(frame.f_lineno)
                # a comprehension ([x * 2 for x in nums]) runs inline and fires the same line again for every item:
                # one step is enough (a 60 × 60 grid would otherwise use the whole step budget on line 1)
                last = self.steps[-1] if self.steps else None
                if (last and not self.pending and last["ev"] == "line" and last["ln"] == frame.f_lineno
                        and last["fid"] == self.fid(frame) and not (li and li.get("kind") in ("for", "while"))):
                    return self.tracer
                if li and li.get("kind") in ("if", "while") and li.get("safe"):
                    try:
                        val = eval(compile(li["test"], USER + "-test", "eval"), frame.f_globals, frame.f_locals)
                        extra = {"cond": bool(val)}
                    except Exception:
                        pass
                if li and li.get("subs"):
                    sv = []
                    for s in li["subs"]:
                        try:
                            container = eval(s["base"], frame.f_globals, frame.f_locals)
                            ix = eval(compile(s["ix"], USER + "-test", "eval"), frame.f_globals, frame.f_locals)
                            val = container[ix]
                            pos = ix if isinstance(container, (list, tuple)) and isinstance(ix, int) else None
                            if pos is not None and pos < 0:
                                pos += len(container)
                            sv.append({"src": s["src"], "base": s["base"], "pos": pos, "val": self.ser(val)})
                        except Exception:
                            pass
                    if sv:
                        extra = dict(extra or {}, subv=sv)
                self.record("line", frame, extra)
            elif self.trace:
                self.truncated = True
            return self.tracer
        if event == "return":
            if self.trace and name != "<module>":
                self.record("return", frame, {"val": self.ser(arg), "callee": name})
            elif self.trace and name == "<module>":
                self.record("end", frame)
            if self.stack and self.stack[-1] is frame:
                self.stack.pop()
            self.frames.pop(id(frame), None)
            return self.tracer
        if event == "exception":
            if self.trace:
                et, ev, _tb = arg
                if not isinstance(ev, (NeedInput, TooManySteps, TooSlow, StopIteration, StopAsyncIteration, GeneratorExit)):
                    self.record("exc", frame, {"etype": et.__name__, "emsg": str(ev)})
            return self.tracer
        return self.tracer


# ----------------------------------------------------------------------------- except guard
# NeedInput / TooManySteps / TooSlow are BaseExceptions, but a bare "except:" (very common around int(input()))
# still catches them: the program then loops "not a number" forever instead of asking. Every except block gets a
# first call that lets our own signals through.
GUARD = "__prism_guard__"


def _guard():
    e = sys.exc_info()[1]
    if isinstance(e, (NeedInput, TooManySteps, TooSlow)):
        raise e


class _Guarder(ast.NodeTransformer):
    def visit_ExceptHandler(self, node):
        self.generic_visit(node)
        if node.body:
            first = node.body[0]
            loc = dict(lineno=first.lineno, col_offset=first.col_offset, end_lineno=first.lineno, end_col_offset=first.col_offset)
            call = ast.Expr(ast.Call(ast.Name(GUARD, ast.Load(), **loc), [], [], **loc), **loc)
            node.body.insert(0, call)
        return node


def guarded(tree):
    t = _Guarder().visit(tree)
    ast.fix_missing_locations(t)
    return t


# ----------------------------------------------------------------------------- work folder
def reset_work(files):
    # empty the folder (it is the current directory, so it can't be removed itself)
    os.makedirs(WORK, exist_ok=True)
    os.chdir(WORK)
    for name in os.listdir(WORK):
        p = os.path.join(WORK, name)
        if os.path.isdir(p) and not os.path.islink(p):
            shutil.rmtree(p, ignore_errors=True)
        else:
            try:
                os.remove(p)
            except OSError:
                pass
    for name, text in (files or {}).items():
        if not name or "/" in name or "\\" in name or name in (".", ".."):
            continue
        with _real_open(os.path.join(WORK, name), "w", encoding="utf-8", newline="") as f:
            f.write(text)


def read_work():
    out = {}
    try:
        for name in sorted(os.listdir(WORK)):
            p = os.path.join(WORK, name)
            if os.path.isfile(p) and os.path.getsize(p) < 2_000_000:
                try:
                    with _real_open(p, "r", encoding="utf-8", newline="") as f:
                        out[name] = f.read()
                except Exception:
                    out[name] = None  # binary / not text
    except Exception:
        pass
    return out


def err_info(exc, run):
    """Error type, message and the learner's line it came from."""
    line = None
    tb = exc.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == USER:
            line = tb.tb_lineno
        tb = tb.tb_next
    if isinstance(exc, SyntaxError) and exc.filename == USER:
        line = exc.lineno
    text = "".join(traceback.format_exception_only(type(exc), exc)).strip()
    # a short traceback with only the learner's frames
    tbl = []
    tb = exc.__traceback__
    lines = run.code.split("\n")
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == USER:
            ln = tb.tb_lineno
            src = lines[ln - 1].strip() if 0 < ln <= len(lines) else ""
            tbl.append({"ln": ln, "fn": tb.tb_frame.f_code.co_name, "src": src})
        tb = tb.tb_next
    if len(tbl) > TB_MAX:  # like Python's "[Previous line repeated N more times]"
        tbl = tbl[:3] + [{"ln": 0, "fn": "", "src": "", "more": len(tbl) - 9}] + tbl[-6:]
    d = {"type": type(exc).__name__, "msg": str(exc), "line": line, "text": text, "tb": tbl}
    if isinstance(exc, SyntaxError):
        d["col"] = exc.offset
        d["msg"] = exc.msg
    if isinstance(exc, NameError):
        d["name"] = getattr(exc, "name", None)
    return d


def prism_run(req_json):
    req = json.loads(req_json)
    run = Run(req)
    random.seed(int(req.get("seed", 12345)))
    reset_work(req.get("files"))
    result = {"ok": True}
    old_out, old_err = sys.stdout, sys.stderr

    class W(io.TextIOBase):
        def __init__(self, kind):
            self.kind = kind

        def write(self, s):
            run.emit(self.kind, str(s))
            return len(s)

        def writable(self):
            return True

    try:
        tree = ast.parse(run.code, USER)
        run.tree = tree
        run.info = line_info(run.code, tree)
        code = compile(guarded(ast.parse(run.code, USER)), USER, "exec")
    except SyntaxError as e:
        result = {"ok": False, "error": err_info(e, run), "out": [], "steps": [], "info": {}, "files": read_work(), "inputs": []}
        return json.dumps(result)

    ns = {"__name__": "__main__", "__builtins__": builtins}
    run.ns = ns
    builtins.input = run._input
    builtins.open = run._open
    setattr(builtins, GUARD, _guard)
    sys.stdout, sys.stderr = W("out"), W("err")
    sys.settrace(run.tracer)
    try:
        exec(code, ns)
    except NeedInput as e:
        result = {"ok": False, "needInput": {"prompt": e.prompt}}
    except TooManySteps:
        result = {"ok": False, "error": {"type": "TooManySteps", "msg": str(run.max_steps), "line": run.stack[-1].f_lineno if run.stack else None, "text": "", "tb": []}}
    except TooSlow:
        result = {"ok": False, "error": {"type": "TooSlow", "msg": str(run.max_secs), "line": run.stack[-1].f_lineno if run.stack else None, "text": "", "tb": []}}
    except SystemExit:
        pass
    except BaseException as e:
        result = {"ok": False, "error": err_info(e, run)}
    finally:
        sys.settrace(None)
        sys.stdout, sys.stderr = old_out, old_err
        builtins.input = _real_input
        builtins.open = _real_open
        try:
            delattr(builtins, GUARD)
        except AttributeError:
            pass
        # close files the program forgot to close, like the real interpreter does at exit (but say so)
        unclosed = []
        for k, v in list(ns.items()):
            if isinstance(v, PrismFile) and not v.closed:
                unclosed.append(v._pname)
                try:
                    v._f.close()
                except Exception:
                    pass
    if run.trace and run.pending and run.steps:
        # effects after the last recorded line (e.g. the final print) belong to a closing step
        last = run.steps[-1]
        run.steps.append({"ev": "end", "ln": last["ln"], "fid": last["fid"], "stack": last["stack"], "fx": run.pending})
        run.pending = []
    result.update({
        "out": run.out,
        "steps": run.steps if run.trace else [],
        "truncated": run.truncated,
        "outCut": run.out_cut,
        "count": run.count,
        "info": {str(k): v for k, v in run.info.items()} if run.trace else {},
        "files": read_work(),
        "inputs": run.inputs_used,
        "unclosed": unclosed,
        "ms": int((time.time() - run.t0) * 1000),
    })
    return json.dumps(result)
