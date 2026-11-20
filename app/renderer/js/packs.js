// Built-in problem packs. "BU Final" = the CS102 final-exam review notebook the user gave (4 problems), with
// hidden test cases (edge values the exam likes: exactly 1000 / 5000, 120 minutes, 2.0 / 1.2 litres …), a correct
// answer (hidden until asked) and the user's own first answers as "find the bug" exercises (name / student ID removed).
//
// Problem shape:
//   { id, title, short, topics[], md, starter, solution, files{name:text} (given input files), outFiles[] (files the
//     program must write — checked), tests[{name, stdin[], files?{}}], buggy[{label, code, hints[]}] }

const Q1_MD = `---
## ข้อที่ 1: ระบบคำนวณส่วนลดสมาชิกและยอดชำระสุทธิ (User-Defined Function with Return)
**รายละเอียดโจทย์:**
ร้านค้าออนไลน์แห่งหนึ่งต้องการคำนวณยอดเงินสุทธิที่ลูกค้าต้องชำระหลังหักส่วนลดตามยอดซื้อรวม จงสร้างฟังก์ชันชื่อ \`calculate_net_price(amount)\` ที่รับยอดซื้อ (\`float\`) เข้ามาคำนวณและคืนค่า (\`return\`) เป็นยอดเงินสุทธิหลังหักส่วนลด ตามเงื่อนไขดังนี้:
* ยอดซื้อน้อยกว่า 1,000 บาท: ไม่ได้รับส่วนลด (จ่ายเต็มจำนวน)
* ยอดซื้อ 1,000 – 4,999.99 บาท: ลด 10% (\`amount * 0.90\`)
* ยอดซื้อตั้งแต่ 5,000 บาทขึ้นไป: ลด 20% (\`amount * 0.80\`)

รับยอดซื้อจากผู้ใช้ทางแป้นพิมพ์ เรียกใช้ฟังก์ชัน และแสดงผลลัพธ์ทศนิยม 2 ตำแหน่ง

**ตัวอย่างการทำงาน (Sample Console Output):**
\`\`\`text
Input purchase amount: 2500
Net payment = 2250.00 Baht
\`\`\``;

const Q2_MD = `---
## ข้อที่ 2: ระบบบันทึกประวัติการเข้าใช้งานห้องปฏิบัติการ (Text File Writing with Loop & Condition)
**รายละเอียดโจทย์:**
เจ้าหน้าที่ดูแลห้องปฏิบัติการต้องการบันทึกเวลาเข้าใช้งาน (หน่วยเป็นนาที) ของนักศึกษาจำนวน \`n\` คนลงในแฟ้มข้อความ จงพัฒนาโปรแกรมภาษา Python เพื่อรับจำนวนนักศึกษา (\`n\` จำนวนเต็ม) และวนรับเวลาที่ใช้งาน (\`mins\` จำนวนเต็ม) ของแต่ละคน โดยมีข้อกำหนดดังนี้:
* หากใช้งานเกิน 120 นาที ให้กำหนดหมายเหตุเป็น \`"Extended"\`
* หากใช้งานไม่เกิน 120 นาที ให้กำหนดหมายเหตุเป็น \`"Regular"\`
* บันทึกลงในไฟล์ชื่อ \`lab_usage.txt\` ในรูปแบบ \`User ลำดับที่ : จำนวนนาที mins [หมายเหตุ]\` (บรรทัดละ 1 คน) และแสดงข้อความแจ้งเมื่อบันทึกเสร็จ

**ตัวอย่างการทำงาน (Sample Console Output):**
\`\`\`text
Number of users: 3
Usage minutes (User 1): 90
Usage minutes (User 2): 150
Usage minutes (User 3): 120
Saved to lab_usage.txt!
\`\`\`
**ตัวอย่างข้อมูลภายในไฟล์ \`lab_usage.txt\`:**
\`\`\`text
User 1 : 90 mins [Regular]
User 2 : 150 mins [Extended]
User 3 : 120 mins [Regular]
\`\`\``;

const Q3_MD = `---
## ข้อที่ 3: ระบบวิเคราะห์ปริมาณน้ำดื่มรายวันของสมาชิกชมรม (Text File Reading with 1D List & Statistics)
**รายละเอียดโจทย์:**
ชมรมคนรักสุขภาพจัดเก็บข้อมูลปริมาณการดื่มน้ำต่อวัน (หน่วยเป็นลิตร) ของสมาชิกไว้ในไฟล์ชื่อ \`water_intake.txt\` (บรรทัดละ 1 คน) จงอ่านข้อมูลทั้งหมดจากไฟล์มาเก็บลงใน \`List\` 1 มิติ (\`water_list\`) แล้วประมวลผลรายงานดังนี้:
* จำแนกและนับจำนวนสมาชิกตามเกณฑ์ 3 ระดับ:
  * ดื่มน้ำเพียงพอ (\`Optimal\`): ตั้งแต่ 2.0 ลิตรขึ้นไป
  * ดื่มน้ำปานกลาง (\`Moderate\`): ตั้งแต่ 1.2 ถึง 1.99 ลิตร
  * ดื่มน้ำน้อย (\`Low\`): ต่ำกว่า 1.2 ลิตร
* คำนวณปริมาณน้ำดื่มรวมทั้งหมด (\`Total\`), ค่าสูงสุด (\`Max\`), ค่าต่ำสุด (\`Min\`) และค่าเฉลี่ย (\`Avg\`) แสดงทศนิยม 2 ตำแหน่ง

**ตัวอย่างข้อมูลต้นฉบับในไฟล์ \`water_intake.txt\`:**
\`\`\`text
2.5
1.0
1.5
3.0
1.8
0.8
\`\`\`

**ตัวอย่างการทำงาน (Sample Console Output):**
\`\`\`text
--- Water Intake Report ---
Optimal (>= 2.0 L)   : 2
Moderate (1.2-1.99 L): 2
Low (< 1.2 L)        : 2
Total = 10.60 L | Avg = 1.77 L | Max = 3.00 L | Min = 0.80 L
\`\`\``;

const Q4_MD = `---
## ข้อที่ 4: ระบบคำนวณค่าบริการคลินิกสัตว์เลี้ยง (File I/O, 1D Lists, Loop, Condition & 3 Functions)
**รายละเอียดโจทย์:**
คลินิกสัตว์เลี้ยงแห่งหนึ่งจัดเก็บข้อมูลการเข้ารับบริการไว้ในไฟล์ \`pet_grooming.txt\` โดยแต่ละบรรทัดประกอบด้วย \`รหัสบริการ (service_id) รหัสขนาดสัตว์เลี้ยง (size_code) และจำนวนตัว (quantity)\` คั่นด้วยช่องว่าง 1 ช่อง จงพัฒนาโปรแกรมภาษา Python โดยสร้างฟังก์ชันหลักอย่างน้อย 3 ฟังก์ชัน (\`read_grooming\`, \`calculate_fee\`, \`export_summary\`) เพื่อประมวลผลและส่งออกไฟล์รายงานชื่อ \`grooming_summary.txt\` โดยมีข้อกำหนดดังนี้:
* เกณฑ์การแปลงรหัสขนาดสัตว์เลี้ยงเป็นชื่อเต็มและอัตราค่าบริการ:
  * รหัส \`'S'\` : ชื่อขนาด \`"Small"\` ค่าบริการตัวละ \`300\` บาท
  * รหัส \`'M'\` : ชื่อขนาด \`"Medium"\` ค่าบริการตัวละ \`450\` บาท
  * รหัส \`'L'\` : ชื่อขนาด \`"Large"\` ค่าบริการตัวละ \`600\` บาท
* เขียนข้อมูลลงในไฟล์ \`grooming_summary.txt\` โดย:
  * บรรทัดแรกแสดงหัวรายงาน: \`=== Pet Grooming Summary ===\`
  * บรรทัดถัดมาแสดงรายการทั้งหมดในรูปแบบ: \`[รหัสบริการ] ชื่อขนาดเต็ม x จำนวนตัว = ยอดเงินรวม THB\` (ทศนิยม 2 ตำแหน่ง)
  * บรรทัดสุดท้ายแสดงยอดรวมทั้งหมดในรูปแบบ: \`Total Revenue: ยอดรวมทั้งหมด THB\` (ทศนิยม 2 ตำแหน่ง)

**ตัวอย่างข้อมูลต้นฉบับในไฟล์ \`pet_grooming.txt\`:**
\`\`\`text
G01 S 2
G02 M 1
G03 L 3
G04 S 1
\`\`\`
**ตัวอย่างการทำงาน (Sample Console Output):**
\`\`\`text
Done! Summary written to grooming_summary.txt
\`\`\`
**ตัวอย่างข้อมูลผลลัพธ์ภายในไฟล์ \`grooming_summary.txt\`:**
\`\`\`text
=== Pet Grooming Summary ===
[G01] Small x 2 = 600.00 THB
[G02] Medium x 1 = 450.00 THB
[G03] Large x 3 = 1800.00 THB
[G04] Small x 1 = 300.00 THB
Total Revenue: 3150.00 THB
\`\`\``;

const WATER = '2.5\n1.0\n1.5\n3.0\n1.8\n0.8\n';
const PETS = 'G01 S 2\nG02 M 1\nG03 L 3\nG04 S 1\n';

export const BU_FINAL = {
  id: 'bu-final',
  name: 'BU Final',
  sub: 'CS102 Fundamental of Computer Programming — ทบทวนก่อนสอบปฏิบัติการปลายภาค',
  builtin: true,
  intro: `# เอกสารทบทวนความรู้ก่อนสอบปฏิบัติการปลายภาค (Final Exam Review)
## วิชา: CS102 Fundamental of Computer Programming — แบบฝึกหัดทบทวน 4 ข้อ
---
### ขอบเขตทักษะที่ฝึกทบทวน (ทั้งหมด 4 ข้อ)
* **ข้อที่ 1:** การสร้างฟังก์ชัน (\`def\`, \`return\`) ร่วมกับเงื่อนไข \`if - elif - else\` และการคำนวณส่วนลด/อัตราค่าบริการ
* **ข้อที่ 2:** การเขียนข้อมูลลงไฟล์ข้อความ (\`open(..., 'w')\`, \`write()\`, \`close()\`) ร่วมกับลูป \`while\` / \`for\` และเงื่อนไข
* **ข้อที่ 3:** การอ่านไฟล์ข้อความ (\`open(..., 'r')\`) เก็บลง \`List\` 1 มิติ การวนลูปคัดแยกกลุ่ม และการคำนวณค่าสถิติ (\`sum\`, \`max\`, \`min\`, \`len\`)
* **ข้อที่ 4:** การประยุกต์บูรณาการ (อ่านไฟล์หลายคอลัมน์ด้วย \`.split()\`, แยกฟังก์ชันหลัก 3 ฟังก์ชัน, คำนวณยอดสุทธิ และเขียนสรุปผลลงไฟล์ใหม่)`,
  problems: [
    {
      id: 'bu1', no: 1, title: 'ระบบคำนวณส่วนลดสมาชิกและยอดชำระสุทธิ', short: 'ฟังก์ชัน + if / elif / else',
      topics: ['function', 'if'],
      md: Q1_MD,
      starter: '# เขียนโค้ดคำตอบข้อที่ 1 ด้านล่างนี้\n',
      solution: `def calculate_net_price(amount):
    if amount < 1000:
        return amount
    elif amount < 5000:
        return amount * 0.90
    else:
        return amount * 0.80

amount = float(input("Input purchase amount: "))
net = calculate_net_price(amount)
print(f"Net payment = {net:.2f} Baht")
`,
      files: {},
      outFiles: [],
      tests: [
        { name: 'ตัวอย่างในโจทย์ (2500)', stdin: ['2500'] },
        { name: 'ยอดน้อย ไม่ได้ส่วนลด (500)', stdin: ['500'] },
        { name: 'ค่าขอบ: 999.99 (ยังไม่ถึง 1,000)', stdin: ['999.99'] },
        { name: 'ค่าขอบ: 1000 พอดี (ต้องลด 10%)', stdin: ['1000'] },
        { name: 'ค่าขอบ: 4999.99 (ยังลด 10%)', stdin: ['4999.99'] },
        { name: 'ค่าขอบ: 5000 พอดี (ต้องลด 20%)', stdin: ['5000'] },
        { name: 'ยอดสูง (12000.50)', stdin: ['12000.50'] },
        { name: 'ยอดเป็น 0', stdin: ['0'] },
      ],
      buggy: [{
        label: 'คำตอบแรกของเจ้าของไฟล์',
        code: `def calculate_net_price(amount):
    if amount >= 0 and amount < 1000:
        netprice = amount
        discount = 0
    elif amount >= 1000 and amount < 5000:
        netprice = amount * 0.90 #amount - (amount * 10/100)
        discount = 10
    elif amount > 5000 :
        netprice = amount * 0.80 #amount - (amount * 20/100)
        discount = 20
    return netprice, discount

saleprice = float(input("Input purchase amount: "))
net,discount = calculate_net_price(saleprice)
print(f"Purchase amount = {saleprice:.2f} Baht")
print(f"Net payment discount {discount}% = {net:.2f} Baht")
`,
        hints: [
          'ลองพิมพ์ 5000 พอดี แล้วดูว่าเข้าเงื่อนไขไหน — "ตั้งแต่ 5,000 ขึ้นไป" ต้องใช้ >= ไม่ใช่ >',
          'ถ้าไม่มี if / elif ไหนเป็นจริงเลย ตัวแปร netprice จะไม่เคยถูกสร้าง → บรรทัด return พัง (UnboundLocalError) ใช้ else: ปิดท้ายจะปลอดภัยกว่า',
          'ผลลัพธ์ต้องตรงกับตัวอย่างทุกตัวอักษร: โจทย์ให้แสดงแค่ "Net payment = 2250.00 Baht" บรรทัดเดียว',
        ],
      }],
    },
    {
      id: 'bu2', no: 2, title: 'ระบบบันทึกประวัติการเข้าใช้งานห้องปฏิบัติการ', short: 'เขียนไฟล์ + ลูป + เงื่อนไข',
      topics: ['loop', 'if', 'filewrite'],
      md: Q2_MD,
      starter: '# เขียนโค้ดคำตอบข้อที่ 2 ด้านล่างนี้\n',
      solution: `n = int(input("Number of users: "))
f = open("lab_usage.txt", "w")
for i in range(1, n + 1):
    mins = int(input(f"Usage minutes (User {i}): "))
    if mins > 120:
        note = "Extended"
    else:
        note = "Regular"
    f.write(f"User {i} : {mins} mins [{note}]\\n")
f.close()
print("Saved to lab_usage.txt!")
`,
      files: {},
      outFiles: ['lab_usage.txt'],
      tests: [
        { name: 'ตัวอย่างในโจทย์ (3 คน)', stdin: ['3', '90', '150', '120'] },
        { name: 'คนเดียว 121 นาที (เกิน 120)', stdin: ['1', '121'] },
        { name: 'ค่าขอบ: 0, 120, 121, 300 นาที', stdin: ['4', '0', '120', '121', '300'] },
        { name: 'มีไฟล์เก่าอยู่แล้ว (ต้องเขียนทับ ไม่ต่อท้าย)', stdin: ['2', '60', '180'], files: { 'lab_usage.txt': 'User 1 : 999 mins [Old data]\n' } },
      ],
      buggy: [{
        label: 'คำตอบแรก (แบบลูปตรงๆ)',
        code: `amount = int(input("Number of users: "))
labfile = open("lab_usage.txt","w")
for count in range(1,amount+1):
    time = int(input(f"Usage minutes (User {count}): "))
    if time >= 0:
        if time > 120:
            note = "Extended"
        else:
            note = "Regular"
        labfile.write(f"User {count}: {time:<3} mins [{note}]\\n")
    else:
        print("input time invalid!!!")
labfile.close()
print("Saved to lab_usage.txt!")
`,
        hints: [
          'ดูรูปแบบในโจทย์ให้ดี: "User 1 : 90 mins" มีช่องว่างทั้งก่อนและหลัง : (โค้ดนี้ไม่มีช่องว่างก่อน :)',
          '{time:<3} คือจัดชิดซ้ายให้กว้าง 3 ช่อง — ถ้า 90 จะกลายเป็น "90 " มีช่องว่างเกินมา 1 ช่อง ใช้ {time} เฉยๆ',
        ],
      }, {
        label: 'คำตอบแรก (แบบแยกฟังก์ชัน)',
        code: `def writefile (time,count,note):
    labfile = open("lab_usage.txt","a")
    labfile.write(f"User {count}: {time:>3} mins [{note}]\\n")
    labfile.close()

def input_time():
    amount = int(input("Number of users: "))
    for count in range(1,amount+1):
        time = int(input(f"Usage minutes (User {count}): "))
        if time >= 0:
            if time > 120:
                note= "Extended"
            else:
                note= "Regular"
            writefile (time,count,note)
        else:
            print("Input time invalid!!!")

input_time()
print("Saved to lab_usage.txt!")
`,
        hints: [
          'โหมด "a" (append) เขียนต่อท้ายของเดิม — รันสองรอบ ข้อมูลรอบก่อนจะค้างอยู่ในไฟล์ (ดูเคสทดสอบ "มีไฟล์เก่าอยู่แล้ว")',
          'รูปแบบต้องเป็น "User 1 : 90 mins" — ช่องว่างหน้า : หายไป และ {time:>3} เติมช่องว่างข้างหน้าตัวเลข',
        ],
      }],
    },
    {
      id: 'bu3', no: 3, title: 'ระบบวิเคราะห์ปริมาณน้ำดื่มรายวันของสมาชิกชมรม', short: 'อ่านไฟล์ + List + สถิติ',
      topics: ['fileread', 'list', 'loop', 'if'],
      md: Q3_MD,
      starter: '# เขียนโค้ดคำตอบข้อที่ 3 ด้านล่างนี้\n',
      solution: `water_list = []
f = open("water_intake.txt", "r")
for line in f:
    if line.strip() != "":
        water_list.append(float(line.strip()))
f.close()

optimal = 0
moderate = 0
low = 0
for water in water_list:
    if water >= 2.0:
        optimal += 1
    elif water >= 1.2:
        moderate += 1
    else:
        low += 1

total = sum(water_list)
avg = total / len(water_list)
print("--- Water Intake Report ---")
print(f"Optimal (>= 2.0 L)   : {optimal}")
print(f"Moderate (1.2-1.99 L): {moderate}")
print(f"Low (< 1.2 L)        : {low}")
print(f"Total = {total:.2f} L | Avg = {avg:.2f} L | Max = {max(water_list):.2f} L | Min = {min(water_list):.2f} L")
`,
      files: { 'water_intake.txt': WATER },
      outFiles: [],
      tests: [
        { name: 'ข้อมูลตัวอย่างในโจทย์', files: { 'water_intake.txt': WATER } },
        { name: 'ค่าขอบ: 2.0, 1.2, 1.19, 1.99', files: { 'water_intake.txt': '2.0\n1.2\n1.19\n1.99\n2.01\n' } },
        { name: 'มีคนไม่ดื่มน้ำเลย (0.0 ลิตร)', files: { 'water_intake.txt': '0.0\n2.5\n1.3\n' } },
        { name: 'สมาชิกคนเดียว', files: { 'water_intake.txt': '1.5\n' } },
        { name: 'ทุกคนดื่มเพียงพอ', files: { 'water_intake.txt': '3.5\n2.25\n2.0\n4.1\n' } },
      ],
      buggy: [{
        label: 'คำตอบแรกของเจ้าของไฟล์',
        code: `water_list = []
waterfile = open("water_intake.txt","r")
for line in waterfile:
    water_list.append(float(line.strip()))
waterfile.close()

opt_cnt = 0
mdr_cut = 0
low_cut = 0
for water in water_list:
    if water >= 2.0:
        opt_cnt += 1
    elif water >= 1.2 and water < 2.0:
        mdr_cut += 1
    elif water > 0 and water < 1.2:
        low_cut += 1

print("--- Water Intake Report ---")
print(f"Optimal (>= 2.0 L)   : {opt_cnt}")
print(f"Moderate (1.2-1.99 L): {mdr_cut}")
print(f"Low (< 1.2 L)        : {low_cut}")
avg = sum(water_list)/len(water_list)
print(f"Total = {sum(water_list):.2f} L | Avg = {avg:.2f} L | Max = {max(water_list):.2f} L | Min = {min(water_list):.2f} L")
`,
        hints: [
          'โจทย์บอกว่า "ต่ำกว่า 1.2 ลิตร" คือ Low ทั้งหมด — 0 ลิตรก็ต่ำกว่า 1.2 แต่ water > 0 ทำให้คนที่ดื่ม 0 ลิตรไม่ถูกนับเลย ใช้ else: แทน',
        ],
      }],
    },
    {
      id: 'bu4', no: 4, title: 'ระบบคำนวณค่าบริการคลินิกสัตว์เลี้ยง', short: '3 ฟังก์ชัน + split + เขียนรายงาน',
      topics: ['function', 'fileread', 'filewrite', 'list', 'split'],
      md: Q4_MD,
      starter: '# เขียนโค้ดคำตอบข้อที่ 4 ด้านล่างนี้\n',
      solution: `service_ids = []
size_codes = []
quantities = []

def read_grooming():
    f = open("pet_grooming.txt", "r")
    for line in f:
        parts = line.split()
        if len(parts) == 3:
            service_ids.append(parts[0])
            size_codes.append(parts[1])
            quantities.append(int(parts[2]))
    f.close()

def calculate_fee(size_code, quantity):
    if size_code == "S":
        return "Small", quantity * 300
    elif size_code == "M":
        return "Medium", quantity * 450
    else:
        return "Large", quantity * 600

def export_summary():
    out = open("grooming_summary.txt", "w")
    out.write("=== Pet Grooming Summary ===\\n")
    total = 0
    for i in range(len(service_ids)):
        name, fee = calculate_fee(size_codes[i], quantities[i])
        total += fee
        out.write(f"[{service_ids[i]}] {name} x {quantities[i]} = {fee:.2f} THB\\n")
    out.write(f"Total Revenue: {total:.2f} THB\\n")
    out.close()
    print("Done! Summary written to grooming_summary.txt")

read_grooming()
export_summary()
`,
      files: { 'pet_grooming.txt': PETS },
      outFiles: ['grooming_summary.txt'],
      tests: [
        { name: 'ข้อมูลตัวอย่างในโจทย์', files: { 'pet_grooming.txt': PETS } },
        { name: 'รายการเดียว (L 1 ตัว)', files: { 'pet_grooming.txt': 'A01 L 1\n' } },
        { name: 'ครบทุกขนาด + จำนวน 0 ตัว', files: { 'pet_grooming.txt': 'P10 M 4\nP11 S 0\nP12 L 2\nP13 S 5\n' } },
      ],
      buggy: [{
        label: 'คำตอบแรกของเจ้าของไฟล์',
        code: `service_id = []
size_code = []
amount_list = []
def read_grooming ():
    file = open("pet_grooming.txt","r")
    for line in file:
        parts = line.split()
        service_id.append(parts[0])
        size_code.append(parts[1])
        amount_list.append(int(parts[2]))
    file.close()

def calculate_fee ():
    size_name = []
    total = []
    for i in range(len(service_id)):
        if size_code[i] == "S":
            size_name.append("Small")
            total.append(300*amount_list[i])
        elif size_code[i] == "M":
            size_name.append("Medium")
            total.append(450*amount_list[i])
        elif size_code[i] == "L":
            size_name.append("Large")
            total.append(600*amount_list[i])
        else:
            size_name.append("Unknows")
            total.append(0)
    return size_name,total

def export_summary (size_name,total):
    petfile = open("grooming_summary.txt","w")
    petfile.write("=== Pet Grooming Summary ===\\n")
    for i in range(len(service_id)):
        petfile.write(f"[{service_id[i]}] {size_name[i]:<8} x {amount_list[i]:>2} = {total[i]:8.2f} THB\\n")
    petfile.close()
    print("Done! Summary written to grooming_summary.txt")

read_grooming ()
size_name,total = calculate_fee ()
export_summary (size_name,total)
`,
        hints: [
          'โจทย์ให้มีบรรทัดสุดท้าย "Total Revenue: 3150.00 THB" — ยังไม่ได้เขียนบรรทัดนี้ลงไฟล์ (ต้องรวมยอดทุกรายการด้วย sum(total))',
          '{size_name[i]:<8}, {amount_list[i]:>2}, {total[i]:8.2f} เติมช่องว่างให้กว้างเท่ากัน — สวยแต่ไม่ตรงกับตัวอย่าง ตัวอย่างใช้ "Small x 2 = 600.00" ช่องว่างแค่ 1 ช่อง',
        ],
      }],
    },
  ],
};

export const TOPIC_NAMES = {
  function: 'ฟังก์ชัน', if: 'if / elif / else', loop: 'ลูป', filewrite: 'เขียนไฟล์', fileread: 'อ่านไฟล์', list: 'List', split: 'split()', stats: 'สถิติ',
  var: 'ตัวแปร', format: 'จัดรูปแบบ f-string', while: 'while',
};
