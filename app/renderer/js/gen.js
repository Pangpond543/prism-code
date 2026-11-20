// New practice problems in the same style as BU Final: 4 templates (function + if, write file, read file + stats,
// 3 functions + split + report) × several stories, with new numbers every time. The answer is generated together
// with the problem, so the expected output (and the hidden tests) always come from a program that really runs.

export function rng(seed) {
  let a = seed >>> 0;
  const f = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.shuffle = (arr) => { const a2 = arr.slice(); for (let i = a2.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [a2[i], a2[j]] = [a2[j], a2[i]]; } return a2; };
  return f;
}
const n2 = (x) => Number(x).toLocaleString('en-US', { maximumFractionDigits: 2 });
const pyNum = (x) => (Number.isInteger(x) ? String(x) : String(+x.toFixed(4)));
const pyMul = (x) => (Number.isInteger(x) ? x.toFixed(1) : x.toFixed(2));

/* ------------------------------------------------- 1. function + if / elif / else */
const T1 = [
  { key: 'shop', title: 'ระบบคำนวณส่วนลดตามยอดซื้อ', en: 'Discount by purchase amount', fn: 'calculate_net_price', p: 'amount', res: 'net', prompt: 'Input purchase amount: ', label: 'Net payment', unit: 'บาท',
    make(r) {
      const t1 = r.pick([500, 1000, 1500, 2000]), t2 = t1 * r.pick([3, 4, 5]), d1 = r.pick([5, 10, 15]), d2 = d1 + r.pick([5, 10]);
      const place = r.pick(['ร้านเครื่องเขียน', 'ร้านกาแฟออนไลน์', 'ร้านหนังสือ', 'ร้านอุปกรณ์กีฬา', 'ร้านขนมเบเกอรี่']);
      return { t1, t2, m: [1, 1 - d1 / 100, 1 - d2 / 100], sample: t1 + Math.round((t2 - t1) / 2 / 100) * 100,
        story: `${place}ต้องการคำนวณยอดเงินสุทธิที่ลูกค้าต้องชำระหลังหักส่วนลดตามยอดซื้อรวม`,
        tiers: [`ยอดซื้อน้อยกว่า ${n2(t1)} บาท: ไม่ได้รับส่วนลด (จ่ายเต็มจำนวน)`, `ยอดซื้อ ${n2(t1)} – ${n2(t2 - 0.01)} บาท: ลด ${d1}% (\`amount * ${pyMul(1 - d1 / 100)}\`)`, `ยอดซื้อตั้งแต่ ${n2(t2)} บาทขึ้นไป: ลด ${d2}% (\`amount * ${pyMul(1 - d2 / 100)}\`)`],
        what: 'รับยอดซื้อ (`float`) เข้ามาคำนวณและคืนค่า (`return`) เป็นยอดเงินสุทธิหลังหักส่วนลด' };
    } },
  { key: 'electric', title: 'ระบบคำนวณค่าไฟฟ้าตามจำนวนหน่วย', fn: 'calculate_bill', p: 'units', res: 'bill', prompt: 'Input electricity units: ', label: 'Electricity bill', unit: 'บาท',
    make(r) {
      const t1 = r.pick([100, 150, 200]), t2 = t1 + r.pick([200, 300, 400]), a = r.pick([3.25, 3.5, 3.75]), b = +(a + r.pick([0.75, 1.0])).toFixed(2), c = +(b + r.pick([0.5, 0.75, 1.0])).toFixed(2);
      return { t1, t2, m: [a, b, c], sample: t1 + 50,
        story: 'การไฟฟ้าหมู่บ้านแห่งหนึ่งต้องการคิดค่าไฟฟ้าตามจำนวนหน่วยที่ใช้ โดยอัตราต่อหน่วยขึ้นกับจำนวนหน่วยทั้งหมด',
        tiers: [`ใช้น้อยกว่า ${t1} หน่วย: หน่วยละ ${a.toFixed(2)} บาท (\`units * ${a.toFixed(2)}\`)`, `ใช้ ${t1} – ${t2 - 1} หน่วย: หน่วยละ ${b.toFixed(2)} บาท (\`units * ${b.toFixed(2)}\`)`, `ใช้ตั้งแต่ ${t2} หน่วยขึ้นไป: หน่วยละ ${c.toFixed(2)} บาท (\`units * ${c.toFixed(2)}\`)`],
        what: 'รับจำนวนหน่วย (`float`) เข้ามาคำนวณและคืนค่า (`return`) เป็นค่าไฟฟ้าทั้งหมด' };
    } },
  { key: 'parking', title: 'ระบบคำนวณค่าจอดรถรายชั่วโมง', fn: 'calculate_parking_fee', p: 'hours', res: 'fee', prompt: 'Input parking hours: ', label: 'Parking fee', unit: 'บาท',
    make(r) {
      const t1 = r.pick([2, 3]), t2 = t1 + r.pick([3, 4, 5]), a = r.pick([10, 15, 20]), b = a + r.pick([10, 15]), c = b + r.pick([10, 20]);
      return { t1, t2, m: [a, b, c], sample: t1 + 1.5,
        story: 'ห้างสรรพสินค้าแห่งหนึ่งคิดค่าจอดรถเป็นรายชั่วโมง ยิ่งจอดนาน อัตราต่อชั่วโมงยิ่งสูง',
        tiers: [`จอดน้อยกว่า ${t1} ชั่วโมง: ชั่วโมงละ ${a} บาท (\`hours * ${a}\`)`, `จอด ${t1} ชั่วโมง แต่น้อยกว่า ${t2} ชั่วโมง: ชั่วโมงละ ${b} บาท (\`hours * ${b}\`)`, `จอดตั้งแต่ ${t2} ชั่วโมงขึ้นไป: ชั่วโมงละ ${c} บาท (\`hours * ${c}\`)`],
        what: 'รับจำนวนชั่วโมง (`float`) เข้ามาคำนวณและคืนค่า (`return`) เป็นค่าจอดรถ' };
    } },
  { key: 'shipping', title: 'ระบบคำนวณค่าส่งพัสดุตามน้ำหนัก', fn: 'calculate_shipping', p: 'weight', res: 'cost', prompt: 'Input parcel weight (kg): ', label: 'Shipping cost', unit: 'บาท',
    make(r) {
      const t1 = r.pick([2, 3, 5]), t2 = t1 * r.pick([3, 4]), a = r.pick([30, 35, 40]), b = a - r.pick([5, 10]), c = b - 5;
      return { t1, t2, m: [a, b, c], sample: t1 + 2.5,
        story: 'บริษัทขนส่งแห่งหนึ่งคิดค่าส่งตามน้ำหนักพัสดุ พัสดุยิ่งหนัก ราคาต่อกิโลกรัมยิ่งถูกลง',
        tiers: [`หนักน้อยกว่า ${t1} kg: กิโลกรัมละ ${a} บาท (\`weight * ${a}\`)`, `หนัก ${t1} kg แต่น้อยกว่า ${t2} kg: กิโลกรัมละ ${b} บาท (\`weight * ${b}\`)`, `หนักตั้งแต่ ${t2} kg ขึ้นไป: กิโลกรัมละ ${c} บาท (\`weight * ${c}\`)`],
        what: 'รับน้ำหนัก (`float`) เข้ามาคำนวณและคืนค่า (`return`) เป็นค่าส่ง' };
    } },
];

function genT1(r) {
  const s = r.pick(T1), v = s.make(r);
  const ret = (m) => (m === 1 ? `return ${s.p}` : `return ${s.p} * ${pyMul(m)}`);
  const solution = `def ${s.fn}(${s.p}):
    if ${s.p} < ${v.t1}:
        ${ret(v.m[0])}
    elif ${s.p} < ${v.t2}:
        ${ret(v.m[1])}
    else:
        ${ret(v.m[2])}

${s.p} = float(input("${s.prompt}"))
${s.res} = ${s.fn}(${s.p})
print(f"${s.label} = {${s.res}:.2f} Baht")
`;
  const sample = v.sample, sampleRes = sample * (sample < v.t1 ? v.m[0] : sample < v.t2 ? v.m[1] : v.m[2]);
  const md = `---
## ${s.title} (User-Defined Function with Return)
**รายละเอียดโจทย์:**
${v.story} จงสร้างฟังก์ชันชื่อ \`${s.fn}(${s.p})\` ที่${v.what} ตามเงื่อนไขดังนี้:
${v.tiers.map((t) => '* ' + t).join('\n')}

รับค่าจากผู้ใช้ทางแป้นพิมพ์ เรียกใช้ฟังก์ชัน และแสดงผลลัพธ์ทศนิยม 2 ตำแหน่ง

**ตัวอย่างการทำงาน (Sample Console Output):**
\`\`\`text
${s.prompt}${pyNum(sample)}
${s.label} = ${sampleRes.toFixed(2)} Baht
\`\`\``;
  const vals = [[pyNum(sample), 'ตัวอย่างในโจทย์'], [pyNum(Math.max(0.5, v.t1 / 2)), 'ค่าน้อย'], [pyNum(v.t1 - 0.01), `ค่าขอบ: ${pyNum(v.t1 - 0.01)} (ยังไม่ถึง ${v.t1})`], [String(v.t1), `ค่าขอบ: ${v.t1} พอดี`],
    [pyNum(v.t2 - 0.01), `ค่าขอบ: ${pyNum(v.t2 - 0.01)}`], [String(v.t2), `ค่าขอบ: ${v.t2} พอดี`], [pyNum(v.t2 * 2 + 0.5), 'ค่ามาก'], ['0', 'ค่าเป็น 0']];
  return { title: s.title, short: 'ฟังก์ชัน + if / elif / else', topics: ['function', 'if'], md, solution, files: {}, outFiles: [],
    tests: vals.map(([x, name]) => ({ name, stdin: [x] })) };
}

/* ------------------------------------------------------- 2. write a file in a loop */
const T2 = [
  { key: 'lab', title: 'ระบบบันทึกเวลาเข้าใช้ห้องคอมพิวเตอร์', who: 'User', whoTh: 'นักศึกษา', count: 'Number of users: ', ask: 'Usage minutes (User {i}): ', v: 'mins', conv: 'int', unit: 'mins', unitTh: 'นาที', file: 'lab_usage.txt',
    thr: [90, 120, 150], cmp: '>', hi: 'Extended', lo: 'Regular', vals: (r, t) => [r.int(20, t - 10), r.int(t + 5, t + 90), t] },
  { key: 'temp', title: 'ระบบบันทึกอุณหภูมิร่างกายรายวัน', who: 'Day', whoTh: 'วัน', count: 'Number of days: ', ask: 'Temperature (Day {i}): ', v: 'temp', conv: 'float', fmt: ':.1f', unit: 'C', unitTh: 'องศาเซลเซียส', file: 'temperature_log.txt',
    thr: [37.5], cmp: '>=', hi: 'Fever', lo: 'Normal', vals: (r, t) => [36.5, +(t + 0.8).toFixed(1), t] },
  { key: 'score', title: 'ระบบบันทึกผลสอบย่อย', who: 'Student', whoTh: 'นักเรียน', count: 'Number of students: ', ask: 'Score (Student {i}): ', v: 'score', conv: 'int', unit: 'points', unitTh: 'คะแนน', file: 'exam_result.txt',
    thr: [50, 60], cmp: '>=', hi: 'Pass', lo: 'Fail', vals: (r, t) => [r.int(t + 5, 100), r.int(10, t - 5), t] },
  { key: 'steps', title: 'ระบบบันทึกจำนวนก้าวเดินรายวัน', who: 'Day', whoTh: 'วัน', count: 'Number of days: ', ask: 'Steps (Day {i}): ', v: 'steps', conv: 'int', unit: 'steps', unitTh: 'ก้าว', file: 'step_log.txt',
    thr: [8000, 10000], cmp: '>=', hi: 'Goal', lo: 'Keep going', vals: (r, t) => [r.int(t + 200, t + 6000), r.int(1500, t - 500), t] },
];

function genT2(r) {
  const s = r.pick(T2), t = r.pick(s.thr), fmt = s.fmt || '';
  const ask = s.ask.replace('{i}', '{i}');
  const solution = `n = int(input("${s.count}"))
f = open("${s.file}", "w")
for i in range(1, n + 1):
    ${s.v} = ${s.conv}(input(f"${ask}"))
    if ${s.v} ${s.cmp} ${t}:
        note = "${s.hi}"
    else:
        note = "${s.lo}"
    f.write(f"${s.who} {i} : {${s.v}${fmt}} ${s.unit} [{note}]\\n")
f.close()
print("Saved to ${s.file}!")
`;
  const vals = r.shuffle(s.vals(r, t)).map(String);
  const shown = (x) => (s.conv === 'float' ? (+x).toFixed(1) : x);
  const isHi = (x) => (s.cmp === '>' ? +x > t : +x >= t);
  const cond = s.cmp === '>' ? `เกิน ${t} ${s.unitTh}` : `ตั้งแต่ ${t} ${s.unitTh}ขึ้นไป`;
  const cond2 = s.cmp === '>' ? `ไม่เกิน ${t} ${s.unitTh}` : `น้อยกว่า ${t} ${s.unitTh}`;
  const md = `---
## ${s.title} (Text File Writing with Loop & Condition)
**รายละเอียดโจทย์:**
จงพัฒนาโปรแกรมภาษา Python เพื่อรับจำนวน${s.whoTh} (\`n\` จำนวนเต็ม) และวนรับค่า (\`${s.v}\` ${s.conv === 'int' ? 'จำนวนเต็ม' : 'ทศนิยม'}) ของแต่ละ${s.whoTh} แล้วบันทึกลงแฟ้มข้อความ โดยมีข้อกำหนดดังนี้:
* หากค่า${cond} ให้กำหนดหมายเหตุเป็น \`"${s.hi}"\`
* หากค่า${cond2} ให้กำหนดหมายเหตุเป็น \`"${s.lo}"\`
* บันทึกลงในไฟล์ชื่อ \`${s.file}\` ในรูปแบบ \`${s.who} ลำดับที่ : ค่า ${s.unit} [หมายเหตุ]\` (บรรทัดละ 1 รายการ${s.conv === 'float' ? ' ค่าแสดงทศนิยม 1 ตำแหน่ง' : ''}) และแสดงข้อความแจ้งเมื่อบันทึกเสร็จ

**ตัวอย่างการทำงาน (Sample Console Output):**
\`\`\`text
${s.count}${vals.length}
${vals.map((x, i) => s.ask.replace('{i}', i + 1) + x).join('\n')}
Saved to ${s.file}!
\`\`\`
**ตัวอย่างข้อมูลภายในไฟล์ \`${s.file}\`:**
\`\`\`text
${vals.map((x, i) => `${s.who} ${i + 1} : ${shown(x)} ${s.unit} [${isHi(x) ? s.hi : s.lo}]`).join('\n')}
\`\`\``;
  const edge = s.conv === 'float' ? [String(+(t - 0.1).toFixed(1)), String(t), String(+(t + 0.1).toFixed(1))] : [String(t - 1), String(t), String(t + 1)];
  return { title: s.title, short: 'เขียนไฟล์ + ลูป + เงื่อนไข', topics: ['loop', 'if', 'filewrite'], md, solution, files: {}, outFiles: [s.file],
    tests: [
      { name: 'ตัวอย่างในโจทย์', stdin: [String(vals.length), ...vals] },
      { name: `ค่าขอบรอบ ๆ ${t}`, stdin: [String(edge.length), ...edge] },
      { name: '1 รายการ', stdin: ['1', vals[0]] },
      { name: 'มีไฟล์เก่าอยู่แล้ว (ต้องเขียนทับ)', stdin: ['2', vals[1], vals[2]], files: { [s.file]: `${s.who} 1 : 0 ${s.unit} [Old data]\n` } },
    ] };
}

/* ---------------------------------------------- 3. read a file → list → 3 groups + stats */
const T3 = [
  { key: 'water', title: 'ระบบวิเคราะห์ปริมาณน้ำดื่มรายวัน', report: 'Water Intake', file: 'water_intake.txt', list: 'water_list', item: 'water', conv: 'float', unit: 'L', unitTh: 'ลิตร',
    levels: [['Optimal', 'ดื่มน้ำเพียงพอ', 2.0], ['Moderate', 'ดื่มน้ำปานกลาง', 1.2], ['Low', 'ดื่มน้ำน้อย']], gen: (r) => +(r.int(5, 35) / 10).toFixed(1) },
  { key: 'sleep', title: 'ระบบวิเคราะห์ชั่วโมงการนอนของนักศึกษา', report: 'Sleep', file: 'sleep_hours.txt', list: 'sleep_list', item: 'hours', conv: 'float', unit: 'h', unitTh: 'ชั่วโมง',
    levels: [['Good', 'นอนเพียงพอ', 7.0], ['Fair', 'นอนพอใช้', 5.0], ['Poor', 'นอนน้อย']], gen: (r) => +(r.int(30, 95) / 10).toFixed(1) },
  { key: 'screen', title: 'ระบบวิเคราะห์เวลาใช้หน้าจอต่อวัน', report: 'Screen Time', file: 'screen_time.txt', list: 'screen_list', item: 'hours', conv: 'float', unit: 'h', unitTh: 'ชั่วโมง',
    levels: [['High', 'ใช้หน้าจอมาก', 6.0], ['Normal', 'ใช้หน้าจอปกติ', 3.0], ['Low', 'ใช้หน้าจอน้อย']], gen: (r) => +(r.int(10, 100) / 10).toFixed(1) },
  { key: 'quiz', title: 'ระบบวิเคราะห์คะแนนสอบย่อยของห้องเรียน', report: 'Quiz Score', file: 'quiz_scores.txt', list: 'score_list', item: 'score', conv: 'float', unit: 'pts', unitTh: 'คะแนน',
    levels: [['Excellent', 'ดีมาก', 80], ['Pass', 'ผ่าน', 50], ['Fail', 'ไม่ผ่าน']], gen: (r) => r.int(20, 100) },
];

function genT3(r) {
  const s = r.pick(T3);
  const [A, B, C] = s.levels, hi = A[2], lo = B[2];
  const fmtN = (x) => (Number.isInteger(hi) && s.key === 'quiz' ? String(x) : (+x).toFixed(1));
  const loTop = Number.isInteger(hi) && s.key === 'quiz' ? String(hi - 1) : (hi - 0.01).toFixed(2);
  const lab = [`${A[0]} (>= ${fmtN(hi)} ${s.unit})`, `${B[0]} (${fmtN(lo)}-${loTop} ${s.unit})`, `${C[0]} (< ${fmtN(lo)} ${s.unit})`];
  const w = Math.max(...lab.map((x) => x.length));
  const padded = lab.map((x) => x.padEnd(w));
  const va = A[0].toLowerCase() + '_count', vb = B[0].toLowerCase() + '_count', vc = C[0].toLowerCase() + '_count';
  const lit = (x) => (s.key === 'quiz' ? String(x) : (+x).toFixed(1));
  const solution = `${s.list} = []
f = open("${s.file}", "r")
for line in f:
    if line.strip() != "":
        ${s.list}.append(${s.conv}(line.strip()))
f.close()

${va} = 0
${vb} = 0
${vc} = 0
for ${s.item} in ${s.list}:
    if ${s.item} >= ${lit(hi)}:
        ${va} += 1
    elif ${s.item} >= ${lit(lo)}:
        ${vb} += 1
    else:
        ${vc} += 1

total = sum(${s.list})
avg = total / len(${s.list})
print("--- ${s.report} Report ---")
print(f"${padded[0]}: {${va}}")
print(f"${padded[1]}: {${vb}}")
print(f"${padded[2]}: {${vc}}")
print(f"Total = {total:.2f} ${s.unit} | Avg = {avg:.2f} ${s.unit} | Max = {max(${s.list}):.2f} ${s.unit} | Min = {min(${s.list}):.2f} ${s.unit}")
`;
  const show = (x) => (s.key === 'quiz' ? String(x) : (+x).toFixed(1));
  let data = Array.from({ length: r.int(5, 8) }, () => s.gen(r));
  data[0] = hi; // the sample always shows the boundary
  data = r.shuffle(data);
  const file = data.map(show).join('\n') + '\n';
  const cnt = [data.filter((x) => x >= hi).length, data.filter((x) => x >= lo && x < hi).length, data.filter((x) => x < lo).length];
  const tot = data.reduce((a, b) => a + b, 0);
  const md = `---
## ${s.title} (Text File Reading with 1D List & Statistics)
**รายละเอียดโจทย์:**
ข้อมูลถูกเก็บไว้ในไฟล์ชื่อ \`${s.file}\` (บรรทัดละ 1 ค่า หน่วยเป็น${s.unitTh}) จงอ่านข้อมูลทั้งหมดจากไฟล์มาเก็บลงใน \`List\` 1 มิติ (\`${s.list}\`) แล้วประมวลผลรายงานดังนี้:
* จำแนกและนับจำนวนตามเกณฑ์ 3 ระดับ:
  * ${A[1]} (\`${A[0]}\`): ตั้งแต่ ${fmtN(hi)} ${s.unitTh}ขึ้นไป
  * ${B[1]} (\`${B[0]}\`): ตั้งแต่ ${fmtN(lo)} ถึง ${loTop} ${s.unitTh}
  * ${C[1]} (\`${C[0]}\`): ต่ำกว่า ${fmtN(lo)} ${s.unitTh}
* คำนวณผลรวมทั้งหมด (\`Total\`), ค่าสูงสุด (\`Max\`), ค่าต่ำสุด (\`Min\`) และค่าเฉลี่ย (\`Avg\`) แสดงทศนิยม 2 ตำแหน่ง

**ตัวอย่างข้อมูลต้นฉบับในไฟล์ \`${s.file}\`:**
\`\`\`text
${file.trimEnd()}
\`\`\`

**ตัวอย่างการทำงาน (Sample Console Output):**
\`\`\`text
--- ${s.report} Report ---
${padded[0]}: ${cnt[0]}
${padded[1]}: ${cnt[1]}
${padded[2]}: ${cnt[2]}
Total = ${tot.toFixed(2)} ${s.unit} | Avg = ${(tot / data.length).toFixed(2)} ${s.unit} | Max = ${Math.max(...data).toFixed(2)} ${s.unit} | Min = ${Math.min(...data).toFixed(2)} ${s.unit}
\`\`\``;
  const edge = [hi, lo, s.key === 'quiz' ? lo - 1 : +(lo - 0.1).toFixed(1), s.key === 'quiz' ? hi - 1 : +(hi - 0.1).toFixed(1)].map(show).join('\n') + '\n';
  return { title: s.title, short: 'อ่านไฟล์ + List + สถิติ', topics: ['fileread', 'list', 'loop', 'if'], md, solution, files: { [s.file]: file }, outFiles: [],
    tests: [
      { name: 'ข้อมูลตัวอย่างในโจทย์', files: { [s.file]: file } },
      { name: 'ค่าขอบของทุกระดับ', files: { [s.file]: edge } },
      { name: 'มีค่า 0', files: { [s.file]: ['0', show(hi + 1)].join('\n') + '\n' } },
      { name: 'ข้อมูลตัวเดียว', files: { [s.file]: show(lo) + '\n' } },
    ] };
}

/* ------------------------------------------ 4. three functions + split + summary file */
const T4 = [
  { key: 'pet', title: 'ระบบคำนวณค่าบริการคลินิกสัตว์เลี้ยง', place: 'คลินิกสัตว์เลี้ยงแห่งหนึ่ง', fin: 'pet_grooming.txt', fout: 'grooming_summary.txt', head: 'Pet Grooming Summary', read: 'read_grooming', id: 'G', what: 'รหัสขนาดสัตว์เลี้ยง', qty: 'จำนวนตัว',
    codes: [['S', 'Small', 300], ['M', 'Medium', 450], ['L', 'Large', 600]] },
  { key: 'cafe', title: 'ระบบสรุปยอดขายร้านกาแฟ', place: 'ร้านกาแฟแห่งหนึ่ง', fin: 'cafe_orders.txt', fout: 'order_summary.txt', head: 'Cafe Order Summary', read: 'read_orders', id: 'C', what: 'รหัสขนาดแก้ว', qty: 'จำนวนแก้ว',
    codes: [['S', 'Small', 45], ['M', 'Medium', 55], ['L', 'Large', 65]] },
  { key: 'wash', title: 'ระบบคำนวณค่าบริการล้างรถ', place: 'ร้านล้างรถแห่งหนึ่ง', fin: 'car_wash.txt', fout: 'wash_summary.txt', head: 'Car Wash Summary', read: 'read_jobs', id: 'W', what: 'รหัสประเภทรถ', qty: 'จำนวนคัน',
    codes: [['C', 'Car', 150], ['S', 'SUV', 250], ['V', 'Van', 300]] },
  { key: 'laundry', title: 'ระบบคำนวณค่าบริการร้านซักรีด', place: 'ร้านซักรีดแห่งหนึ่ง', fin: 'laundry.txt', fout: 'laundry_summary.txt', head: 'Laundry Summary', read: 'read_laundry', id: 'L', what: 'รหัสบริการ', qty: 'จำนวนถุง',
    codes: [['W', 'Wash', 40], ['D', 'Dry', 30], ['I', 'Iron', 25]] },
];

function genT4(r) {
  const s = r.pick(T4);
  const codes = s.codes.map(([c, n, p]) => [c, n, p + r.pick([-10, 0, 0, 10, 20]) * (p >= 100 ? 1 : 0.5)]);
  const [a, b, c] = codes;
  const solution = `service_ids = []
codes = []
quantities = []

def ${s.read}():
    f = open("${s.fin}", "r")
    for line in f:
        parts = line.split()
        if len(parts) == 3:
            service_ids.append(parts[0])
            codes.append(parts[1])
            quantities.append(int(parts[2]))
    f.close()

def calculate_fee(code, quantity):
    if code == "${a[0]}":
        return "${a[1]}", quantity * ${pyNum(a[2])}
    elif code == "${b[0]}":
        return "${b[1]}", quantity * ${pyNum(b[2])}
    else:
        return "${c[1]}", quantity * ${pyNum(c[2])}

def export_summary():
    out = open("${s.fout}", "w")
    out.write("=== ${s.head} ===\\n")
    total = 0
    for i in range(len(service_ids)):
        name, fee = calculate_fee(codes[i], quantities[i])
        total += fee
        out.write(f"[{service_ids[i]}] {name} x {quantities[i]} = {fee:.2f} THB\\n")
    out.write(f"Total Revenue: {total:.2f} THB\\n")
    out.close()
    print("Done! Summary written to ${s.fout}")

${s.read}()
export_summary()
`;
  const rows = Array.from({ length: r.int(3, 5) }, (_, i) => [`${s.id}${String(i + 1).padStart(2, '0')}`, r.pick(codes), r.int(1, 4)]);
  const file = rows.map(([id, cd, q]) => `${id} ${cd[0]} ${q}`).join('\n') + '\n';
  let total = 0;
  const lines = rows.map(([id, cd, q]) => { const f = q * cd[2]; total += f; return `[${id}] ${cd[1]} x ${q} = ${f.toFixed(2)} THB`; });
  const md = `---
## ${s.title} (File I/O, 1D Lists, Loop, Condition & 3 Functions)
**รายละเอียดโจทย์:**
${s.place}จัดเก็บข้อมูลการใช้บริการไว้ในไฟล์ \`${s.fin}\` โดยแต่ละบรรทัดประกอบด้วย \`รหัสรายการ ${s.what} และ${s.qty}\` คั่นด้วยช่องว่าง 1 ช่อง จงพัฒนาโปรแกรมภาษา Python โดยสร้างฟังก์ชันหลักอย่างน้อย 3 ฟังก์ชัน (\`${s.read}\`, \`calculate_fee\`, \`export_summary\`) เพื่อประมวลผลและส่งออกไฟล์รายงานชื่อ \`${s.fout}\` โดยมีข้อกำหนดดังนี้:
* เกณฑ์การแปลงรหัสเป็นชื่อเต็มและอัตราค่าบริการ:
${codes.map(([cd, n, p]) => `  * รหัส \`'${cd}'\` : ชื่อ \`"${n}"\` ราคาหน่วยละ \`${pyNum(p)}\` บาท`).join('\n')}
* เขียนข้อมูลลงในไฟล์ \`${s.fout}\` โดย:
  * บรรทัดแรกแสดงหัวรายงาน: \`=== ${s.head} ===\`
  * บรรทัดถัดมาแสดงรายการทั้งหมดในรูปแบบ: \`[รหัสรายการ] ชื่อเต็ม x จำนวน = ยอดเงินรวม THB\` (ทศนิยม 2 ตำแหน่ง)
  * บรรทัดสุดท้ายแสดงยอดรวมทั้งหมดในรูปแบบ: \`Total Revenue: ยอดรวมทั้งหมด THB\` (ทศนิยม 2 ตำแหน่ง)

**ตัวอย่างข้อมูลต้นฉบับในไฟล์ \`${s.fin}\`:**
\`\`\`text
${file.trimEnd()}
\`\`\`
**ตัวอย่างการทำงาน (Sample Console Output):**
\`\`\`text
Done! Summary written to ${s.fout}
\`\`\`
**ตัวอย่างข้อมูลผลลัพธ์ภายในไฟล์ \`${s.fout}\`:**
\`\`\`text
=== ${s.head} ===
${lines.join('\n')}
Total Revenue: ${total.toFixed(2)} THB
\`\`\``;
  const all = codes.map((cd, i) => `${s.id}9${i} ${cd[0]} ${i + 2}`).join('\n') + `\n${s.id}99 ${a[0]} 0\n`;
  return { title: s.title, short: '3 ฟังก์ชัน + split + เขียนรายงาน', topics: ['function', 'fileread', 'filewrite', 'list', 'split'], md, solution, files: { [s.fin]: file }, outFiles: [s.fout],
    tests: [
      { name: 'ข้อมูลตัวอย่างในโจทย์', files: { [s.fin]: file } },
      { name: 'รายการเดียว', files: { [s.fin]: `${s.id}01 ${c[0]} 1\n` } },
      { name: 'ครบทุกรหัส + จำนวน 0', files: { [s.fin]: all } },
    ] };
}

export const TEMPLATES = [
  { key: 't1', name: 'ฟังก์ชัน + if / elif / else', icon: 'bolt', make: genT1 },
  { key: 't2', name: 'เขียนไฟล์ + ลูป + เงื่อนไข', icon: 'edit', make: genT2 },
  { key: 't3', name: 'อ่านไฟล์ + List + สถิติ', icon: 'chart', make: genT3 },
  { key: 't4', name: '3 ฟังก์ชัน + split + รายงาน', icon: 'layers', make: genT4 },
];

export function generate(key, seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0) {
  const r = rng(seed);
  const t = TEMPLATES.find((x) => x.key === key) || r.pick(TEMPLATES);
  const p = t.make(r);
  return { id: `gen-${t.key}-${seed.toString(36)}`, template: t.key, seed, starter: '# เขียนโค้ดคำตอบด้านล่างนี้\n', buggy: [], created: Date.now(), ...p };
}

// The sample output shown in the problem text is replaced by what the answer really prints / writes
// (Python's sum() rounds a little differently from JavaScript, so never trust the JS-computed sample).
export async function finalize(p, runPython) {
  const t = p.tests[0];
  const res = await runPython({ code: p.solution, stdin: t.stdin || [], files: { ...p.files, ...(t.files || {}) }, trace: false });
  if (!res.ok) return p;
  const out = (res.out || []).filter((o) => o[0] !== 'err').map((o) => o[1]).join('').replace(/\n$/, '');
  const lines = p.md.split('\n'), md = [];
  let label = '';
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```\w*\s*$/.test(lines[i])) {
      md.push(lines[i]);
      const body = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i++]);
      let rep = null;
      if (/Sample Console Output/.test(label)) rep = out;
      for (const f of p.outFiles) if (label.includes(f) && /ภายในไฟล์|ผลลัพธ์/.test(label) && res.files[f] != null) rep = res.files[f].replace(/\n$/, '');
      md.push(...(rep !== null ? rep.split('\n') : body));
      if (i < lines.length) md.push(lines[i]);
      continue;
    }
    if (lines[i].trim()) label = lines[i].trim();
    md.push(lines[i]);
  }
  return { ...p, md: md.join('\n') };
}
