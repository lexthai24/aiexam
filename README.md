# ติวสอบ อสพ. — ระบบฝึกทำข้อสอบออนไลน์ พร้อมคำอธิบายจาก AI

ระบบฝึกทำข้อสอบตำแหน่ง **อาสาพัฒนา (อสพ.) กรมการพัฒนาชุมชน กระทรวงมหาดไทย**
ตอบข้อสอบแล้วรู้ผลถูก/ผิดทันที พร้อม **คำอธิบายรายข้อจาก AI (Deepseek)** ที่บอกว่า
**"ทำไมต้องตอบข้อนี้"** เพื่อให้เข้าใจเหตุผลและจำได้

## ไฮไลต์

- **3 โหมดการฝึก**: 📚 ฝึกฝน (เฉลย+คำอธิบายทันที), ⏱️ จับเวลาเสมือนสอบจริง (เลือกเวลาเอง ทำรวดไม่เฉลย แล้วสรุปตอนจบ), 🔁 ทบทวนข้อที่ผิด (หยิบเฉพาะข้อที่เคยตอบผิดของแต่ละคน)
- **แยกข้อมูลรายคนด้วยชื่อ + PIN**: ผู้ใช้ใส่ชื่อและ PIN 4 หลักก่อนเริ่ม ข้อมูลผูกกับคนนั้นใน DB ใช้ต่อจากเครื่องไหนก็ได้ (คนละ PIN = คนละคน แม้ชื่อซ้ำ) — PIN เก็บเป็น hash
- **Mobile-first responsive**: ออกแบบสำหรับมือถือเป็นหลัก ใช้ได้ทั้งจอเล็ก/ใหญ่
- **AI อธิบายว่า "ทำไมต้องตอบข้อนี้"**: ทุกข้อจะได้คำอธิบายที่ขึ้นต้นด้วยเหตุผลว่าทำไมคำตอบที่ถูกจึงถูก (อ้างอิงหลักการ/นิยาม/กฎ) ตามด้วยว่าทำไมข้ออื่นผิด และเทคนิคจำ
- **คลังข้อสอบขนาดใหญ่ จัดชุดตามหลักสูตรจริง**: มีข้อสอบหลายร้อยข้อ แบ่งตาม 14 หมวดของหลักสูตร แต่ละรอบ **สุ่มมา 100 ข้อโดยถ่วงน้ำหนักหมวดให้เหมือนสนามสอบจริง** (ดู `src/lib/blueprint.ts`) — ต่อให้คลังมี 200/1000 ข้อ ก็จัดชุดละ 100 เสมอ ลำดับต่างกันทุกรอบ (deterministic ต่อรอบ — reload กลางคันลำดับไม่เปลี่ยน กด "เริ่มทำใหม่" ได้ชุดใหม่)
- **แคชประหยัด quota + โหลดเร็ว**: คำอธิบายทุกข้อถูก pre-generate เก็บใน DB ไว้ล่วงหน้า (`npm run pregenerate`) เวลาใช้งานจึงดึงจากแคชทันที **ไม่เรียก Deepseek ซ้ำ** ไม่เปลือง quota และไม่ต้องรอ
- **เพิ่มข้อสอบได้เรื่อยๆ + มีตัวตรวจสอบ**: เพิ่มไฟล์หมวดใน `prisma/data/` → `npm run validate` (เช็คข้อซ้ำ/โครงสร้าง/เฉลย) → `npm run seed` → `npm run pregenerate`
- **UI/UX เพื่อการเรียนรู้**: ทำทีละข้อ, feedback ทันที, แถบความคืบหน้า, สรุปผล และทบทวนรายข้อ

## เทคโนโลยี

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Prisma 7** + **Prisma Postgres / Accelerate**
- **Tailwind CSS 4** + **react-markdown**
- **Deepseek API** (ผ่าน OpenAI-compatible SDK)

## การติดตั้ง

1. ติดตั้ง dependencies

   ```bash
   npm install
   ```

2. ตั้งค่า environment — คัดลอก `.env.example` เป็น `.env.local` แล้วกรอกค่า

   ```bash
   cp .env.example .env.local
   ```

   | ตัวแปร | คำอธิบาย |
   | --- | --- |
   | `DATABASE_URL` | Prisma Postgres / Accelerate connection string (ใช้ตอน runtime) |
   | `DIRECT_DATABASE_URL` | Direct Postgres connection string (ใช้ตอน migrate / seed) |
   | `DEEPSEEK_API_KEY` | API key จาก https://platform.deepseek.com/ |
   | `DEEPSEEK_BASE_URL` | ค่าเริ่มต้น `https://api.deepseek.com` |
   | `DEEPSEEK_MODEL` | ค่าเริ่มต้น `deepseek-chat` |

3. สร้างตารางในฐานข้อมูลและ seed ข้อสอบ 100 ข้อ

   ```bash
   npm run db:push   # สร้าง schema ในฐานข้อมูล
   npm run seed      # เพิ่มข้อสอบ 100 ข้อ (idempotent — รันซ้ำได้)
   ```

4. รัน dev server

   ```bash
   npm run dev
   ```

   เปิด http://localhost:3000

## คำสั่งที่มีให้ใช้

| คำสั่ง | หน้าที่ |
| --- | --- |
| `npm run dev` | รัน dev server |
| `npm run build` | build สำหรับ production |
| `npm run validate` | ตรวจคลังข้อสอบ: ข้อซ้ำ, โครงสร้างตัวเลือก, เฉลย, และจำนวนต่อหมวดเทียบเป้า |
| `npm run seed` | seed / อัปเดตข้อสอบจากคลัง (`prisma/bank.ts`) |
| `npm run pregenerate` | สร้างคำอธิบาย AI ล่วงหน้าทุกข้อ เก็บใน DB (เพิ่ม `-- --force` เพื่อสร้างใหม่ทั้งหมด) |
| `npm run db:push` | ดัน schema เข้าฐานข้อมูล |
| `npm run clear:explanations` | ล้างคำอธิบายที่แคชไว้ (ทั้งหมด หรือระบุ id เช่น `-- 1 2 3`) มีประโยชน์หลังแก้ prompt |

## โครงสร้างหลัก

```
prisma/
  schema.prisma           # โมเดล User / Question / Choice / Explanation / Attempt
  data/                   # คลังข้อสอบแยกตามหมวด + shared.ts (q() helper, blueprint)
  questions.ts            # ข้อสอบชุดแรก 100 ข้อ
  bank.ts                 # รวมทุกหมวด + ใส่เลขลำดับ (แหล่งข้อมูลของ seed)
  validate.ts             # ตรวจข้อซ้ำ/โครงสร้าง/เฉลย/จำนวนต่อหมวด
  seed.ts                 # สคริปต์ seed (idempotent ตาม key)
  pregenerate.ts          # สร้างคำอธิบาย AI ล่วงหน้า
  clearExplanations.ts    # ล้างคำอธิบายที่แคชไว้
src/
  lib/
    prisma.ts             # Prisma client (Accelerate)
    deepseek.ts           # เรียก Deepseek สร้างคำอธิบาย "ทำไมต้องตอบข้อนี้"
    types.ts
  app/api/
    questions/            # GET รายการข้อสอบ (ไม่ส่งเฉลยไป client)
    answer/               # POST ตรวจคำตอบฝั่ง server + บันทึก attempt
    explanation/[questionId]/  # GET คำอธิบาย (แคชใน DB)
  components/
    Quiz.tsx              # หน้าจอทำข้อสอบหลัก
    ExplanationPanel.tsx  # แผงคำอธิบายจาก AI (render markdown)
```

## การเพิ่มข้อสอบ

เปิด `prisma/questions.ts` แล้วเพิ่มข้อใหม่ต่อท้าย array ด้วยตัวช่วย `q(...)`
กำหนดหมายเลข, หมวด, โจทย์, ตัวเลือก 4 ข้อ (ก/ข/ค/ง) และ label ของคำตอบที่ถูก
จากนั้น

```bash
npm run seed          # เพิ่ม/อัปเดตข้อสอบ
npm run pregenerate   # สร้างคำอธิบาย AI ของข้อใหม่ล่วงหน้า (ข้ามข้อที่มีแล้ว)
```

ข้อสอบใหม่จะปรากฏในระบบทันที (seed เป็น idempotent ตาม `key` จึงรันซ้ำได้อย่างปลอดภัย)
ระบบจะสุ่มหยิบมาแค่ **100 ข้อต่อรอบ** เสมอ ไม่ว่าจะมีข้อสอบทั้งหมดกี่ข้อ และแต่ละรอบลำดับไม่เหมือนกัน

## วิธีทำงานของแคชคำอธิบาย

1. ผู้เรียนตอบข้อสอบ → เรียก `GET /api/explanation/:id`
2. ถ้ามีคำอธิบายในตาราง `Explanation` แล้ว → ส่งกลับทันที (ไม่เรียก Deepseek)
3. ถ้ายังไม่มี → เรียก Deepseek สร้างคำอธิบาย แล้ว `upsert` ลง DB → ครั้งต่อไปเป็นแคชถาวร

เพราะคำตอบที่ถูกของแต่ละข้อไม่เปลี่ยน จึงเก็บคำอธิบายไว้ 1 รายการต่อ 1 ข้อ

## หมายเหตุด้านความปลอดภัย

- API `/api/questions` จะไม่ส่งฟิลด์ `isCorrect` ออกไป เฉลยถูกตรวจฝั่ง server เท่านั้น
- ค่า secret ทั้งหมดอยู่ใน `.env.local` ซึ่งถูก git-ignore
