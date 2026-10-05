# ตั้งค่า AI Analysis (Phase 3) — ทำครั้งเดียว

AI ทำงานผ่าน Supabase Edge Function ชื่อ `analyze` เพื่อให้ API key ของ AI อยู่ฝั่ง server เท่านั้น (ไม่อยู่ใน browser)

## 1. เตรียม Anthropic API key
สร้างที่ https://console.anthropic.com (Settings → API Keys) เก็บเป็นความลับ ห้ามใส่ใน `.env.local` และห้ามใส่ใน source code

## 2. ใส่ key เป็น secret ใน Supabase
Dashboard → Edge Functions → **Secrets** → Add new secret
- Name: `ANTHROPIC_API_KEY`  Value: key ของคุณ
- (ไม่บังคับ) `ANTHROPIC_MODEL` ถ้าต้องการเปลี่ยนรุ่น ค่าเริ่มต้นคือ `claude-sonnet-5-5`

## 3. สร้าง function
Dashboard → Edge Functions → **Deploy a new function** → **Via Editor**
- ตั้งชื่อ function ว่า `analyze` (ตัวพิมพ์เล็กทั้งหมด)
- ลบโค้ดตัวอย่างออก แล้ววางเนื้อหาไฟล์ `supabase/functions/analyze/index.ts` ทั้งไฟล์
- กด **Deploy**
- เข้าหน้า function `analyze` → Details/Settings แล้ว **ปิด "Verify JWT"** (ไม่เป็นอันตราย เพราะ function ตรวจผู้ใช้เองจาก token ทุกครั้งและปฏิเสธคนที่ไม่ได้ล็อกอิน)

## 4. ทดสอบ
`npm run dev` → เปิดหน้า AI Analysis → กด **Analyze with AI**
ถ้ามี error ให้ดูที่ Dashboard → Edge Functions → analyze → Logs

## หมายเหตุเรื่องค่าใช้จ่าย
ทุกครั้งที่กดปุ่มจะเรียก AI 1 ครั้ง (มีค่าใช้จ่ายตามการใช้งาน) แนะนำตั้ง usage limit ใน Anthropic Console
