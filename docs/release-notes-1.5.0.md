## Prism Code 1.5.0

### ภาษาไทย

**แก้ไข (ตามที่เพื่อนแจ้งว่าโปรแกรมค้าง หน้าต่างขาว และเครื่องช้า)**
- **หน้าต่างขาว/ค้าง:** เวอร์ชัน 1.4.0 ส่งบันทึกการรันโค้ดทั้งก้อนมาที่หน้าต่างทีเดียว โค้ดที่วนไม่รู้จบหรือลิสต์ใหญ่ทำให้กินความจำเป็นร้อยเมกะไบต์ ตอนนี้จำกัดให้ไม่เกินประมาณ 10 MB
- **หน้าต่างขาวแล้วไม่กลับมา:** ตอนนี้ถ้าหน้าโปรแกรมล่มหรือไม่ตอบสนอง โปรแกรมจะโหลดหน้าใหม่ให้เอง (ภายในครึ่งวินาทีในการทดสอบ) ถ้า WebView2 หายทั้งตัวจะเปิดโปรแกรมใหม่ให้
- **เครื่องช้าเมื่อเปิดโปรแกรมทิ้งไว้:** พื้นหลังและแอนิเมชันตกแต่งเคยกิน CPU ราว 1.3–1.8 แกนตอนไม่ได้ทำอะไร ตอนนี้ถ้าไม่ขยับเมาส์/คีย์บอร์ด 8 วินาที หรือมีหน้าต่างอื่นอยู่ด้านหน้า พื้นหลังและแอนิเมชันตกแต่งจะหยุดเอง วัดได้ราว 1–4% CPU และ 0% GPU (แอนิเมชันอธิบายโค้ดทีละขั้นไม่หยุด)

**ใหม่**
- **โหมดคลาสสิก** — กดปุ่มพระจันทร์/ดวงอาทิตย์จะมีเมนูเล็กให้เลือก ธีม (สว่าง / มืด) และสไตล์ (แก้ว / คลาสสิก) โหมดคลาสสิกเป็นพื้นเรียบ ไม่มีพื้นหลังเคลื่อนไหว ไม่มีแสงหักเห ไม่มีแอนิเมชันตกแต่ง เน้นใช้งาน และใช้เครื่องน้อยกว่า
- **โลโก้ใหม่** ใหญ่และชัดขึ้น ทั้งในโปรแกรมและไอคอนบนทาสก์บาร์ พร้อมลายเซ็น "by 543"
- **แจ้งเตือนเวอร์ชันใหม่** — จุดสีชมพูบนปุ่ม ⓘ และป้ายเล็กๆ กดแล้วไปหน้าอัปเดตได้เลย

---

### English

**Fixes (from a friend's report: freezing, white window, slow PC)**
- **White window / freeze:** v1.4.0 sent the whole step recording to the page in one go; an endless loop or a big list could use hundreds of MB. It is now capped at about 10 MB.
- **White window never came back:** if the page crashes or stops responding, the app now reloads it by itself (within half a second in testing); if WebView2 disappears completely, the app restarts.
- **Slow PC while the app sat open:** the background and decorative animations used about 1.3–1.8 CPU cores while idle. They now stop by themselves after 8 seconds without mouse / keyboard use, or when another window is in front. Measured: about 1–4% CPU and 0% GPU (the step-by-step code animation is never paused).

**New**
- **Classic look** — the moon/sun button now opens a small menu: Theme (Light / Dark) and Style (Glass / Classic). Classic is flat and still: no moving background, no refraction, no decorative animation — calm, focused, and lighter on your PC.
- **New logo**, bigger and clearer, in the app and on the taskbar, with the "by 543" mark.
- **Update nudge** — a pink dot on ⓘ and a small chip; one click takes you to the update.

---

**Download:** `Prism-Code-1.5.0-Setup.exe` (installer) or `Prism-Code-1.5.0-Portable.zip` (no install — unzip and run `prism-code.exe`). Windows 10/11 64-bit.
Already using Prism Code? Open ⓘ → **Update now**.
SmartScreen may warn because the app is not code-signed: **More info → Run anyway**.
