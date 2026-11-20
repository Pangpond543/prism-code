// "ทายก่อนรัน" — short programs with new numbers each time; the learner types what they think it prints, then the
// real run (and the animation) shows why. Topics follow the exam: variables, if, loops, functions, lists, f-string,
// split, files.
import { rng } from './gen.js';

const Q = [
  { topic: 'var', name: 'ตัวแปรและการคำนวณ', make: (r) => {
    const a = r.int(2, 9), b = r.int(2, 9), c = r.int(2, 4);
    return `a = ${a}\nb = ${b}\na = a + b\nb = a * ${c}\nprint(a, b)\n`;
  } },
  { topic: 'var', name: 'หาร / หารปัดเศษ / เศษ', make: (r) => {
    const a = r.int(11, 40), b = r.int(3, 7);
    return `x = ${a}\ny = ${b}\nprint(x / y)\nprint(x // y)\nprint(x % y)\n`;
  } },
  { topic: 'if', name: 'if / elif / else', make: (r) => {
    const t1 = r.pick([50, 60, 70]), t2 = t1 + 20, v = r.pick([t1 - 1, t1, t1 + 5, t2, t2 + 3]);
    return `score = ${v}\nif score >= ${t2}:\n    print("A")\nelif score >= ${t1}:\n    print("B")\nelse:\n    print("C")\nprint("done")\n`;
  } },
  { topic: 'if', name: 'เงื่อนไขซ้อน and / or', make: (r) => {
    const age = r.pick([15, 18, 20, 25]), money = r.pick([50, 100, 150]);
    return `age = ${age}\nmoney = ${money}\nif age >= 18 and money >= 100:\n    print("buy")\nelif age >= 18 or money >= 100:\n    print("maybe")\nelse:\n    print("no")\n`;
  } },
  { topic: 'loop', name: 'for + range', make: (r) => {
    const a = r.int(1, 3), b = r.int(6, 10), s = r.pick([1, 2, 3]);
    return `total = 0\nfor i in range(${a}, ${b}, ${s}):\n    total = total + i\nprint(total)\n`;
  } },
  { topic: 'loop', name: 'while', make: (r) => {
    const n = r.pick([20, 37, 50, 64, 100]);
    return `n = ${n}\ncount = 0\nwhile n > 1:\n    n = n // 2\n    count += 1\nprint(n, count)\n`;
  } },
  { topic: 'loop', name: 'ลูปซ้อน', make: (r) => {
    const n = r.int(2, 4);
    return `for i in range(1, ${n + 1}):\n    line = ""\n    for j in range(i):\n        line = line + "*"\n    print(line)\n`;
  } },
  { topic: 'function', name: 'ฟังก์ชัน return', make: (r) => {
    const a = r.int(2, 6), b = r.int(2, 5), k = r.int(1, 3);
    return `def calc(x, y):\n    result = x * y + ${k}\n    return result\n\nans = calc(${a}, ${b})\nprint(ans)\nprint(calc(ans, 2))\n`;
  } },
  { topic: 'function', name: 'ฟังก์ชัน + if', make: (r) => {
    const v = r.pick([500, 1000, 4999, 5000, 7000]);
    return `def net_price(amount):\n    if amount < 1000:\n        return amount\n    elif amount < 5000:\n        return amount * 0.9\n    else:\n        return amount * 0.8\n\nprint(net_price(${v}))\n`;
  } },
  { topic: 'function', name: 'ตัวแปรในฟังก์ชัน', make: (r) => {
    const x = r.int(3, 9);
    return `x = ${x}\n\ndef change(x):\n    x = x + 10\n    return x\n\ny = change(x)\nprint(x, y)\n`;
  } },
  { topic: 'list', name: 'List', make: (r) => {
    const nums = Array.from({ length: 4 }, () => r.int(1, 20)), add = r.int(1, 30);
    return `nums = [${nums.join(', ')}]\nnums.append(${add})\nprint(len(nums), sum(nums))\nprint(max(nums), min(nums))\nprint(nums[1], nums[-1])\n`;
  } },
  { topic: 'list', name: 'นับด้วยลูปใน List', make: (r) => {
    const nums = Array.from({ length: 6 }, () => r.pick([0.8, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0])), t = r.pick([1.2, 2.0]);
    return `water = [${nums.join(', ')}]\ncount = 0\nfor w in water:\n    if w >= ${t}:\n        count += 1\nprint(count)\n`;
  } },
  { topic: 'format', name: 'f-string ทศนิยม', make: (r) => {
    const p = r.pick([1234.5, 99.999, 2250, 0.456, 7.05]);
    return `price = ${p}\nprint(f"{price:.2f}")\nprint(f"{price:.1f}")\nprint(f"Total = {price * 2:.2f} Baht")\n`;
  } },
  { topic: 'format', name: 'f-string จัดช่องว่าง', make: (r) => {
    const n = r.pick(['Small', 'Large', 'Tom', 'Medium']), q = r.int(1, 9);
    return `name = "${n}"\nqty = ${q}\nprint(f"[{name}] x {qty}")\nprint(f"[{name:<8}] x {qty:>3}")\n`;
  } },
  { topic: 'split', name: 'split() + แปลงชนิด', make: (r) => {
    const id = `G0${r.int(1, 9)}`, s = r.pick(['S', 'M', 'L']), q = r.int(1, 5);
    return `line = "${id} ${s} ${q}"\nparts = line.split()\nprint(parts)\nprint(parts[0], int(parts[2]) * 300)\n`;
  } },
  { topic: 'filewrite', name: 'เขียนแล้วอ่านไฟล์', make: (r) => {
    const k = r.int(2, 5), n = r.int(2, 4);
    return `f = open("data.txt", "w")\nfor i in range(1, ${n + 1}):\n    f.write(f"{i * ${k}}\\n")\nf.close()\n\ntotal = 0\nf = open("data.txt", "r")\nfor line in f:\n    total += int(line.strip())\nf.close()\nprint(total)\n`;
  } },
  { topic: 'filewrite', name: 'โหมด "w" กับ "a"', make: (r) => {
    const m1 = r.pick(['w', 'a']), m2 = r.pick(['w', 'a']);
    return `f = open("log.txt", "w")\nf.write("A\\n")\nf.close()\n\nf = open("log.txt", "${m1}")\nf.write("B\\n")\nf.close()\n\nf = open("log.txt", "${m2}")\nf.write("C\\n")\nf.close()\n\nprint(open("log.txt").read())\n`;
  } },
];

export const QUIZ_TOPICS = [...new Set(Q.map((q) => q.topic))];

export function makeQuiz(topic, seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0) {
  const r = rng(seed);
  const pool = topic && topic !== 'all' ? Q.filter((q) => q.topic === topic) : Q;
  const q = r.pick(pool);
  return { id: `quiz-${seed.toString(36)}`, topic: q.topic, name: q.name, code: q.make(r), seed };
}
