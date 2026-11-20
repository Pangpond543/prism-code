# Prism Code

**TH** — เรียน Python ด้วยการ *ดูมันรัน*: ค่าลอยออกจากตัวแปรไปเข้าตัวแปรที่ใช้มัน การเรียกฟังก์ชันสไลด์เข้า–ออกเป็นการ์ด
ไฟล์ค่อยๆ เติมทีละบรรทัด มีโจทย์สไตล์ข้อสอบ ตรวจคำตอบด้วยเทสต์ที่ซ่อนไว้ และควิซทายผลลัพธ์ ใช้ได้โดยไม่ต้องต่อเน็ต

**EN** — Learn Python by watching it run: values float out of variables into the variable that uses them, function calls slide
in and out as cards, files fill line by line. Exam-style problems, answer checking with hidden tests and a predict-the-output
quiz. Works fully offline (Python runs in WebAssembly inside the app). Thai / English UI, light / dark mode.

## ดาวน์โหลด / Download

ไปที่หน้า **[Releases](../../releases/latest)** แล้วเลือกไฟล์ใดไฟล์หนึ่ง (Windows 10/11, 64-bit) /
Go to the **[Releases page](../../releases/latest)** and pick one:

| ไฟล์ / File | ใช้เมื่อ / For |
| --- | --- |
| `Prism-Code-x.y.z-Setup.exe` | **แนะนำ** — ตัวติดตั้ง ดับเบิลคลิกแล้วกดถัดไป มีไอคอนบนเดสก์ท็อปและเมนู Start · **Recommended** — installer with desktop & Start-menu shortcuts |
| `Prism-Code-x.y.z-Portable.zip` | ไม่ต้องติดตั้ง — แตกไฟล์ zip แล้วดับเบิลคลิก `prism-code.exe` · No install — unzip and run `prism-code.exe` |

> **Windows เตือน "ไม่ทราบผู้เผยแพร่" / SmartScreen warning** — โปรแกรมยังไม่ได้ลงลายเซ็นดิจิทัล กด **ข้อมูลเพิ่มเติม → เรียกใช้อยู่ดี**
> The app is not code-signed. Click **More info → Run anyway**.

อัปเดต: กดปุ่ม ⓘ (Info) ในโปรแกรม → **ตรวจสอบอัปเดต** · Updates: press ⓘ (Info) in the app → **Check for updates**.

## ความสามารถ / Features
- เห็นการทำงานทีละบรรทัด: ค่าไหลระหว่างตัวแปร, ฟังก์ชันเป็นการ์ด, ไฟล์เติมทีละบรรทัด · Step-by-step view of values, calls and files
- โปรแกรมแก้ไขสีแบบ VS Code Dark Modern พร้อมคำอธิบายภาษาไทยเมื่อชี้เมาส์ · VS Code Dark Modern editor with Thai hover help
- ชุดโจทย์ "BU Final" + โจทย์สร้างอัตโนมัติ ตรวจด้วยเทสต์ซ่อน · "BU Final" pack + generated exam-style problems, hidden tests
- ควิซทายผลลัพธ์ · Predict-the-output quiz
- เปิด `.py` / `.ipynb` (และ `.txt` ข้างๆ), คลังไฟล์และโฟลเดอร์ · Open `.py` / `.ipynb`, library with folders

## Build from source
Tauri 2 + Rust (GNU toolchain) + CodeMirror + Pyodide. `bash tools/vendor.sh` (libraries), `bash tools/build.sh` (exe),
`bash tools/release.sh` (Setup.exe + Portable.zip; needs NSIS 3).

## License
MIT — © 2026 Thanakorn Damrikitjaroen. Pyodide (MPL-2.0) and CodeMirror (MIT) are bundled under their own licences.
