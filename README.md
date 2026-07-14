# ติวสอบ อสพ. — ระบบฝึกทำข้อสอบออนไลน์ พร้อมคำอธิบายจาก AI

ระบบฝึกทำข้อสอบตำแหน่ง **อาสาพัฒนา (อสพ.) กรมการพัฒนาชุมชน กระทรวงมหาดไทย**
ตอบข้อสอบแล้วรู้ผลถูก/ผิดทันที พร้อม **คำอธิบายรายข้อจาก AI (Deepseek)** ที่บอกว่า
**"ทำไมต้องตอบข้อนี้"** เพื่อให้เข้าใจเหตุผลและจำได้

## ไฮไลต์

- **AI อธิบายว่า "ทำไมต้องตอบข้อนี้"**: ทุกข้อจะได้คำอธิบายที่ขึ้นต้นด้วยเหตุผลว่าทำไมคำตอบที่ถูกจึงถูก (อ้างอิงหลักการ/นิยาม/กฎ) ตามด้วยว่าทำไมข้ออื่นผิด และเทคนิคจำ
- **แคชประหยัด quota**: คำอธิบายของแต่ละข้อจะถูกบันทึกในฐานข้อมูลครั้งแรกที่สร้าง ครั้งต่อไปดึงจาก DB ทันที **ไม่เรียก Deepseek ซ้ำ** จึงไม่เปลือง quota
- **เพิ่มข้อสอบได้เรื่อยๆ**: แค่เพิ่มข้อมูลใน `prisma/questions.ts` แล้วรัน `npm run seed`
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
| `npm run seed` | seed / อัปเดตข้อสอบจาก `prisma/questions.ts` |
| `npm run db:push` | ดัน schema เข้าฐานข้อมูล |
| `npm run clear:explanations` | ล้างคำอธิบายที่แคชไว้ (ทั้งหมด หรือระบุ id เช่น `-- 1 2 3`) มีประโยชน์หลังแก้ prompt |

## โครงสร้างหลัก

```
prisma/
  schema.prisma           # โมเดล Question / Choice / Explanation / Attempt
  questions.ts            # ข้อมูลข้อสอบ 100 ข้อ (แก้ที่นี่เพื่อเพิ่มข้อสอบ)
  seed.ts                 # สคริปต์ seed (idempotent ตาม key)
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
npm run seed
```

ข้อสอบใหม่จะปรากฏในระบบทันที (seed เป็น idempotent ตาม `key` จึงรันซ้ำได้อย่างปลอดภัย)

## วิธีทำงานของแคชคำอธิบาย

1. ผู้เรียนตอบข้อสอบ → เรียก `GET /api/explanation/:id`
2. ถ้ามีคำอธิบายในตาราง `Explanation` แล้ว → ส่งกลับทันที (ไม่เรียก Deepseek)
3. ถ้ายังไม่มี → เรียก Deepseek สร้างคำอธิบาย แล้ว `upsert` ลง DB → ครั้งต่อไปเป็นแคชถาวร

เพราะคำตอบที่ถูกของแต่ละข้อไม่เปลี่ยน จึงเก็บคำอธิบายไว้ 1 รายการต่อ 1 ข้อ

## หมายเหตุด้านความปลอดภัย

- API `/api/questions` จะไม่ส่งฟิลด์ `isCorrect` ออกไป เฉลยถูกตรวจฝั่ง server เท่านั้น
- ค่า secret ทั้งหมดอยู่ใน `.env.local` ซึ่งถูก git-ignore
