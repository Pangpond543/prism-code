// Python errors explained in plain Thai: what happened, why, and what to try. Returns {title, why, fix}.
import { T } from './i18n.js';

function closest(word, cands) {
  let best = null, bd = 99;
  const lev = (a, b) => {
    const d = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = d[0]; d[0] = i;
      for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
    }
    return d[b.length];
  };
  for (const c of cands) { if (c === word) continue; const x = lev(word.toLowerCase(), c.toLowerCase()); if (x < bd) { bd = x; best = c; } }
  return bd <= Math.max(1, Math.floor(word.length / 3)) ? best : null;
}

export function explain(err, code = '') {
  if (!err) return null;
  const msg = err.msg || '', type = err.type || '';
  const names = [...new Set(code.match(/[A-Za-z_]\w*/g) || [])].concat(['print', 'input', 'int', 'float', 'str', 'len', 'range', 'open', 'sum', 'max', 'min', 'append', 'split', 'strip']);
  const r = (title, why, fix) => ({ title: T(title), why: T(why), fix: fix ? T(fix) : '' });
  let m;
  switch (type) {
    case 'SyntaxError':
    case 'IndentationError':
    case 'TabError':
      if (/expected ':'/.test(msg)) return r('ลืมเครื่องหมาย :', 'บรรทัดที่ขึ้นต้นด้วย if / elif / else / for / while / def ต้องจบด้วย : เสมอ', 'เติม : ท้ายบรรทัด');
      if (/unterminated (triple-quoted )?string/.test(msg)) return r('ลืมปิดเครื่องหมายคำพูด', 'ข้อความเปิดด้วย " หรือ \' แล้วแต่ไม่ได้ปิด', 'เติมเครื่องหมายคำพูดปิดให้ครบคู่');
      if ((m = /'(.)' was never closed/.exec(msg))) return r('วงเล็บไม่ครบคู่', `เปิดวงเล็บ ${m[1]} แล้วไม่ได้ปิด`, 'นับวงเล็บเปิด-ปิดให้เท่ากัน (สีวงเล็บช่วยดูได้: คู่เดียวกันจะสีเดียวกัน)');
      if (/unmatched '(.)'/.test(msg) || /closing parenthesis/.test(msg)) return r('วงเล็บปิดเกินมา', 'มีวงเล็บปิดที่ไม่มีวงเล็บเปิดคู่กัน', 'ลบวงเล็บที่เกินออก หรือเติมวงเล็บเปิดให้ครบ');
      if (/expected an indented block/.test(msg)) return r('ลืมย่อหน้า', 'หลังบรรทัดที่จบด้วย : ต้องมีโค้ดที่ย่อหน้าเข้าไปอย่างน้อย 1 บรรทัด', 'กด Tab ที่บรรทัดถัดไป (ถ้ายังไม่มีอะไรจะเขียน ใช้ pass)');
      if (/unexpected indent/.test(msg)) return r('ย่อหน้าเกิน', 'บรรทัดนี้ย่อหน้าเข้าไปโดยไม่มี if / for / def ด้านบนรองรับ', 'ลบช่องว่างหน้าบรรทัดให้ตรงกับบรรทัดก่อนหน้า');
      if (/unindent does not match/.test(msg) || /inconsistent use of tabs/.test(msg)) return r('ย่อหน้าไม่ตรงกัน', 'ระยะย่อหน้าของบรรทัดนี้ไม่ตรงกับบล็อกไหนเลย (อาจปน Tab กับเว้นวรรค)', 'จัดย่อหน้าใหม่ให้เท่ากับบรรทัดที่อยู่ระดับเดียวกัน ทีละ 4 ช่อง');
      if (/invalid character '(.)'/.test(msg) || /invalid non-printable/.test(msg)) return r('มีตัวอักษรแปลกปลอม', 'อาจเป็นเครื่องหมายคำพูดแบบโค้ง “ ” หรือ ‘ ’ ที่ก๊อปมาจาก Word / LINE หรือช่องว่างพิเศษ', 'พิมพ์เครื่องหมายคำพูด " ใหม่ด้วยคีย์บอร์ด');
      if (/invalid decimal literal/.test(msg)) return r('ตัวเลขติดตัวอักษร', 'ชื่อตัวแปรห้ามขึ้นต้นด้วยตัวเลข หรือเขียนตัวเลขติดกับตัวอักษร เช่น 2x', 'ใช้ * คูณ (2 * x) หรือเปลี่ยนชื่อตัวแปร');
      if (/Maybe you meant '==' /.test(msg) || /cannot assign to/.test(msg) && /comparison/.test(msg)) return r('ใช้ = แทน ==', 'ในเงื่อนไข if ต้องใช้ == (เท่ากับ) ส่วน = คือการเก็บค่าใส่ตัวแปร', 'เปลี่ยน = เป็น ==');
      if (/Perhaps you forgot a comma/.test(msg)) return r('ลืมเครื่องหมายจุลภาค ,', 'มีค่าหลายตัววางติดกันโดยไม่มี , คั่น', 'เติม , ระหว่างค่าแต่ละตัว');
      if (/'return' outside function/.test(msg)) return r('return อยู่นอกฟังก์ชัน', 'return ใช้ได้เฉพาะในฟังก์ชันที่สร้างด้วย def', 'ย่อหน้า return ให้อยู่ในฟังก์ชัน หรือใช้ print แทน');
      if (/'break' outside loop|'continue' not properly in loop/.test(msg)) return r('break / continue อยู่นอกลูป', 'คำสั่งนี้ใช้ได้เฉพาะในลูป for / while', 'ย่อหน้าให้อยู่ในลูป');
      if (/expected 'except' or 'finally'/.test(msg)) return r('try ไม่ครบ', 'ทุก try: ต้องมี except: หรือ finally: ตามมา', 'เติม except: หลังบล็อก try');
      return r('เขียนผิดไวยากรณ์', 'Python อ่านบรรทัดนี้ไม่เข้าใจ — มักเกิดจากลืม : วงเล็บไม่ครบ หรือสะกดคำสั่งผิด', 'ดูตรงที่ขีดเส้นแดง และบรรทัดก่อนหน้า (บางทีผิดที่บรรทัดก่อน)');
    case 'NameError': {
      const nm = err.name || ((m = /name '([^']+)'/.exec(msg)) && m[1]) || '';
      const hint = (m = /Did you mean: '([^']+)'/.exec(msg)) ? m[1] : closest(nm, names);
      if (/^(Print|Input|Int|Float|Len|Range|True|False)$/.test(nm) && hint) return r(`${nm} ไม่มีอยู่จริง (ตัวพิมพ์ใหญ่-เล็กสำคัญ)`, 'Python แยกตัวพิมพ์ใหญ่กับเล็ก', `ใช้ ${hint}`);
      if (/^(true|false|none)$/.test(nm)) return r(`ต้องเขียน ${nm[0].toUpperCase() + nm.slice(1)}`, 'True / False / None ต้องขึ้นต้นด้วยตัวพิมพ์ใหญ่', '');
      return r(`ไม่รู้จักชื่อ ${nm}`, hint ? `ยังไม่มีตัวแปรหรือฟังก์ชันชื่อนี้ — พิมพ์ผิดจาก ${hint} หรือเปล่า?` : 'ยังไม่มีตัวแปรหรือฟังก์ชันชื่อนี้ในตอนที่บรรทัดนี้ทำงาน: อาจพิมพ์ผิด ลืมสร้างก่อนใช้ หรือสร้างไว้ในฟังก์ชันอื่น',
        hint ? `เปลี่ยนเป็น ${hint}` : 'ตรวจว่าสร้างตัวแปรนี้ไว้ก่อนบรรทัดนี้ และสะกดตรงกันทุกตัวอักษร (ถ้าเป็นข้อความ ต้องมี " ครอบ)');
    }
    case 'UnboundLocalError': {
      const nm = ((m = /variable '([^']+)'/.exec(msg)) && m[1]) || '';
      return r(`ตัวแปร ${nm} ยังไม่มีค่า`, `ในฟังก์ชันนี้ ${nm} ถูกสร้างอยู่ในเงื่อนไข if / elif บางทางเท่านั้น — ค่าที่ส่งเข้ามารอบนี้ไม่เข้าเงื่อนไขไหนเลย เลยไม่เคยถูกสร้าง`,
        'ตรวจค่าขอบ (เช่น > กับ >=) และปิดท้ายด้วย else: เพื่อให้ทุกค่ามีทางไป');
    }
    case 'TypeError':
      if (/can only concatenate str \(not "(\w+)"\) to str/.test(msg)) return r('เอาข้อความไปบวกกับตัวเลข', 'ใช้ + ต่อข้อความได้เฉพาะ str กับ str', 'แปลงตัวเลขด้วย str(x) หรือใช้ f-string: f"ยอด {x}"');
      if ((m = /unsupported operand type\(s\) for ([^:]+): '(\w+)' and '(\w+)'/.exec(msg))) {
        if (m[2] === 'str' || m[3] === 'str') return r('คำนวณกับข้อความ', `ค่าหนึ่งเป็น str (ข้อความ) — ค่าที่ได้จาก input() หรืออ่านจากไฟล์เป็นข้อความเสมอ`, 'แปลงก่อนคำนวณ: int(input(...)) หรือ float(line)');
        if (m[2] === 'NoneType' || m[3] === 'NoneType') return r('คำนวณกับ None', 'ค่าหนึ่งเป็น None — มักมาจากฟังก์ชันที่ลืม return', 'เติม return ในฟังก์ชันที่เรียก');
        return r('ชนิดข้อมูลคำนวณด้วยกันไม่ได้', `ใช้ ${m[1]} กับ ${m[2]} และ ${m[3]} ไม่ได้`, 'ตรวจชนิดข้อมูลของทั้งสองฝั่ง');
      }
      if (/'[<>]=?' not supported between instances of '(\w+)' and '(\w+)'/.test(msg)) return r('เปรียบเทียบข้อความกับตัวเลข', 'เช่น "90" > 120 — ค่าจาก input() เป็นข้อความ ยังไม่ใช่ตัวเลข', 'ครอบด้วย int() หรือ float() ตอนรับค่า');
      if (/write\(\) argument must be str, not (\w+)/.test(msg)) return r('write() รับได้แค่ข้อความ', 'f.write() เขียนตัวเลขตรงๆ ไม่ได้', 'ใช้ f.write(str(x) + "\\n") หรือ f.write(f"{x}\\n")');
      if (/can't multiply sequence by non-int of type '(\w+)'/.test(msg)) return r('เอาข้อความไปคูณ', 'ค่านี้ยังเป็นข้อความ (str) อยู่ — "2500" * 0.9 คำนวณไม่ได้', 'แปลงด้วย float() ก่อน');
      if ((m = /(\w+)\(\) takes (\d+) positional arguments? but (\d+) (were|was) given/.exec(msg))) return r(`ส่งค่าให้ ${m[1]}() จำนวนไม่ตรง`, `ฟังก์ชันรับ ${m[2]} ค่า แต่ส่งไป ${m[3]} ค่า`, 'นับพารามิเตอร์ใน def ให้ตรงกับจำนวนค่าที่ส่งตอนเรียก');
      if ((m = /(\w+)\(\) missing (\d+) required positional arguments?: (.+)/.exec(msg))) return r(`ส่งค่าให้ ${m[1]}() ไม่ครบ`, `ยังขาด ${m[3]}`, 'ใส่ค่าให้ครบทุกพารามิเตอร์ตอนเรียกฟังก์ชัน');
      if ((m = /'(\w+)' object is not callable/.exec(msg))) return r('เรียกสิ่งที่ไม่ใช่ฟังก์ชัน', `มีตัวแปรชนิด ${m[1]} อยู่ในชื่อที่ถูกเรียกแบบฟังก์ชัน — มักเกิดจากตั้งชื่อตัวแปรซ้ำกับฟังก์ชัน เช่น sum = 0 แล้วเรียก sum(...)`, 'เปลี่ยนชื่อตัวแปร เช่น total แทน sum, max_v แทน max');
      if (/cannot unpack non-iterable NoneType/.test(msg) || /'NoneType' object is not (subscriptable|iterable)/.test(msg)) return r('ได้ None กลับมา', 'ฟังก์ชันที่เรียกไม่ได้ return ค่าออกมา (หรือ return แค่บางเงื่อนไข)', 'ตรวจว่าทุกทางในฟังก์ชันมี return');
      if ((m = /'(\w+)' object is not iterable/.exec(msg))) return r(`วนลูปบน ${m[1]} ไม่ได้`, m[1] === 'int' ? 'for ต้องวนบนชุดข้อมูล เช่น list หรือ range — ตัวเลขเดี่ยววนไม่ได้' : 'ค่านี้ไม่ใช่ชุดข้อมูลที่วนได้', m[1] === 'int' ? 'ใช้ for i in range(n):' : '');
      if ((m = /'(\w+)' object is not subscriptable/.exec(msg))) return r(`ใช้ [ ] กับ ${m[1]} ไม่ได้`, 'วงเล็บเหลี่ยมใช้กับ list / str / dict เท่านั้น', '');
      if (/list indices must be integers or slices, not (\w+)/.test(msg)) return r('ลำดับใน list ต้องเป็นจำนวนเต็ม', 'เช่น lst["1"] หรือ lst[1.0] ใช้ไม่ได้', 'แปลงด้วย int() หรือใช้ตัวนับจาก range()');
      if (/unsupported format string passed to (\w+)\.__format__/.test(msg)) return r('จัดรูปแบบตัวเลขกับข้อความ', 'ใช้ :.2f กับค่าที่ยังเป็นข้อความ (str) อยู่', 'แปลงด้วย float() ก่อน');
      return r('ชนิดข้อมูลไม่ถูกต้อง', 'ค่าที่ใช้ในบรรทัดนี้เป็นชนิดที่คำสั่งนี้รับไม่ได้', 'ดูค่าของตัวแปรในแผง "ภาพการทำงาน" ว่าเป็น int / float / str');
    case 'ValueError':
      if (/could not convert string to float: ''/.test(msg) || /invalid literal for int\(\) with base 10: ''/.test(msg)) return r('แปลงข้อความว่างเป็นตัวเลขไม่ได้', 'ไม่ได้พิมพ์อะไรเลย หรือไฟล์มีบรรทัดว่าง (เช่นบรรทัดสุดท้าย)', 'ข้ามบรรทัดว่าง: if line.strip() != "":');
      if ((m = /invalid literal for int\(\) with base 10: '([^']*)'/.exec(msg))) return r(`แปลง '${m[1]}' เป็น int ไม่ได้`, /\./.test(m[1]) ? 'int() แปลงตัวเลขที่มีจุดทศนิยมไม่ได้' : 'ข้อความนี้ไม่ใช่ตัวเลขล้วน', /\./.test(m[1]) ? 'ใช้ float() แทน' : 'ตรวจว่าค่าที่แปลงเป็นตัวเลข (ไฟล์อาจมีหลายคอลัมน์ → ใช้ split() ก่อน)');
      if ((m = /could not convert string to float: '([^']*)'/.exec(msg))) return r(`แปลง '${m[1]}' เป็นตัวเลขไม่ได้`, 'ข้อความนี้ไม่ใช่ตัวเลข', 'ถ้าบรรทัดมีหลายค่า ใช้ line.split() แยกก่อน แล้วค่อยแปลงทีละช่อง');
      if (/I\/O operation on closed file/.test(msg)) return r('ใช้ไฟล์หลังปิดไปแล้ว', 'เรียก write / read หลังจาก close() ไปแล้ว', 'ย้าย close() ไปไว้หลังลูป (ไม่ย่อหน้าเข้าไปในลูป)');
      if ((m = /not enough values to unpack \(expected (\d+), got (\d+)\)/.exec(msg))) return r('ค่ามีน้อยกว่าตัวแปรที่รับ', `ฝั่งซ้ายมี ${m[1]} ตัวแปร แต่ค่ามีแค่ ${m[2]} ค่า — เช่นบรรทัดในไฟล์มีคอลัมน์ไม่ครบ หรือเป็นบรรทัดว่าง`, 'ตรวจข้อมูลในไฟล์ หรือเช็ก len(parts) ก่อน');
      if ((m = /too many values to unpack \(expected (\d+)/.exec(msg))) return r('ค่ามีมากกว่าตัวแปรที่รับ', `ฝั่งซ้ายมี ${m[1]} ตัวแปร แต่ค่ามีมากกว่านั้น`, 'เพิ่มตัวแปรให้ครบ หรือใช้ parts[0], parts[1] ทีละตัว');
      if (/max\(\) (arg|iterable argument) is an empty sequence|min\(\) (arg|iterable argument) is an empty sequence/.test(msg)) return r('หา max / min จาก list ว่าง', 'list ยังไม่มีข้อมูลเลย — อาจอ่านไฟล์ไม่ได้อะไร', 'ตรวจว่า append ค่าเข้า list แล้ว');
      return r('ค่าไม่ถูกต้อง', 'ชนิดถูกแต่ค่าใช้ไม่ได้ เช่นแปลงข้อความที่ไม่ใช่ตัวเลข', '');
    case 'ZeroDivisionError':
      return r('หารด้วยศูนย์', 'ตัวหารเป็น 0 — ถ้าหาค่าเฉลี่ย แปลว่า list ว่าง (len = 0)', 'ตรวจว่ามีข้อมูลก่อนหาร: if len(lst) > 0:');
    case 'IndexError':
      if (/list index out of range/.test(msg)) return r('ลำดับเกินขนาด list', 'list ที่มี n ตัว ใช้ลำดับได้ 0 ถึง n-1 เท่านั้น (ตัวแรกคือ [0])', 'ใช้ range(len(lst)) และถ้า split() แล้ว ตรวจว่ามีครบทุกคอลัมน์');
      if (/string index out of range/.test(msg)) return r('ลำดับเกินความยาวข้อความ', 'ข้อความยาว n ตัวอักษร ใช้ลำดับ 0 ถึง n-1', '');
      return r('ลำดับเกินขนาด', '', '');
    case 'KeyError': return r(`ไม่มีคีย์ ${msg}`, 'dict นี้ไม่มีคีย์ที่ขอ', 'ใช้ d.get(key) หรือตรวจด้วย if key in d:');
    case 'AttributeError':
      if ((m = /'(\w+)' object has no attribute '(\w+)'/.exec(msg))) {
        const [, ty, at] = m;
        if (ty === 'list' && /split|strip|upper|lower|replace/.test(at)) return r(`list ไม่มี .${at}()`, `.${at}() ใช้กับข้อความ (str) — แต่ค่านี้เป็น list แล้ว`, 'ใช้กับแต่ละบรรทัดก่อน append หรือใช้ lst[i].' + at + '()');
        if (ty === 'str' && /append/.test(at)) return r('ข้อความไม่มี .append()', '.append() ใช้กับ list เท่านั้น', 'สร้าง list ด้วย [] แล้วค่อย append');
        if (ty === 'NoneType') return r(`None ไม่มี .${at}`, 'ค่านี้เป็น None — มักมาจากฟังก์ชันที่ไม่ได้ return หรือ x = lst.append(...) (append คืน None)', '');
        return r(`${ty} ไม่มี .${at}`, 'คำสั่งนี้ใช้กับข้อมูลชนิดนี้ไม่ได้ หรือสะกดชื่อผิด', closest(at, ['append', 'split', 'strip', 'write', 'read', 'readline', 'readlines', 'close', 'upper', 'lower']) ? `หมายถึง .${closest(at, ['append', 'split', 'strip', 'write', 'read', 'readline', 'readlines', 'close', 'upper', 'lower'])}() หรือเปล่า?` : '');
      }
      return r('ไม่มีคำสั่งนี้', msg, '');
    case 'FileNotFoundError': {
      const f = ((m = /'([^']+)'/.exec(msg)) && m[1]) || '';
      return r(`ไม่พบไฟล์ ${f}`, 'ยังไม่มีไฟล์ชื่อนี้ในแท็บ "ไฟล์" — ตรวจตัวสะกด ตัวพิมพ์ใหญ่-เล็ก และนามสกุล .txt', 'สร้างไฟล์ใหม่หรือนำไฟล์เข้าจากเครื่องในแท็บ "ไฟล์"');
    }
    case 'UnsupportedOperation':
      if (/not readable/.test(msg)) return r('ไฟล์นี้เปิดไว้สำหรับเขียน', 'เปิดด้วยโหมด "w" หรือ "a" แต่พยายามอ่าน', 'ปิดไฟล์แล้วเปิดใหม่ด้วย "r"');
      if (/not writable/.test(msg)) return r('ไฟล์นี้เปิดไว้สำหรับอ่าน', 'เปิดด้วยโหมด "r" (ค่าเริ่มต้น) แต่พยายามเขียน', 'เปิดด้วย open(ชื่อ, "w") หรือ "a"');
      return r('ใช้ไฟล์ผิดวิธี', msg, '');
    case 'RecursionError': return r('ฟังก์ชันเรียกตัวเองไม่หยุด', 'ฟังก์ชันเรียกตัวเองซ้ำไปเรื่อยๆ จนเกินขีดจำกัด', 'ต้องมีเงื่อนไขหยุด (base case)');
    case 'TooManySteps': return r('โปรแกรมทำงานไม่จบ', 'ทำงานเกิน 1,500,000 ขั้นแล้วยังไม่จบ — น่าจะมีลูปที่ไม่มีวันหยุด เช่น while ที่เงื่อนไขไม่เคยเป็นเท็จ หรือลืมเพิ่มค่าตัวนับ', 'ดูบรรทัดที่ไฮไลต์ — ตัวแปรในเงื่อนไข while ต้องเปลี่ยนค่าในลูป');
    case 'TooSlow': return r('โปรแกรมทำงานนานเกินไป', 'ทำงานเกิน 12 วินาที เลยหยุดให้ก่อน', 'ตรวจลูปที่อาจวนไม่จบ');
    case 'Stopped': return r('หยุดโปรแกรมแล้ว', 'กดหยุดระหว่างทำงาน', '');
    case 'KeyboardInterrupt': return r('หยุดโปรแกรมแล้ว', '', '');
    case 'EOFError': return r('ไม่มีค่าให้ input() อ่าน', 'โปรแกรมขอค่ามากกว่าที่ให้ไว้', '');
    case 'ImportError': case 'ModuleNotFoundError': return r('นำเข้าโมดูลไม่ได้', 'โมดูลนี้ไม่มีในโปรแกรม (ใช้ได้เฉพาะโมดูลมาตรฐานของ Python เช่น math, random)', '');
    default: return r(type || 'เกิดข้อผิดพลาด', msg, '');
  }
}
