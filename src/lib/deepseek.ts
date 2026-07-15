import OpenAI from "openai";

// Deepseek is OpenAI-API compatible, so we reuse the OpenAI SDK pointed at the
// Deepseek base URL. The client is created lazily so a missing key only errors
// when an explanation is actually requested (not at import time).
let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY is not set. Add it to .env.local to generate AI explanations."
    );
  }
  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
    });
  }
  return client;
}

export function getModel(): string {
  return process.env.DEEPSEEK_MODEL || "deepseek-chat";
}

export interface ExplanationInput {
  category: string;
  questionNumber: number;
  questionText: string;
  choices: { label: string; text: string }[];
  correctLabel: string;
  correctText: string;
}

/**
 * Ask Deepseek to explain why the correct answer is correct, in Thai, written
 * in a memorable, study-friendly way. Returns the explanation text.
 *
 * This makes a real API call — callers should cache the result in the database
 * (see the explanation API route) so quota is only spent once per question.
 */
export async function generateExplanation(
  input: ExplanationInput
): Promise<string> {
  // Reference choices by their text only — NOT by ก/ข/ค/ง — because the app
  // shuffles choice positions per round, so label letters aren't stable.
  const choicesBlock = input.choices.map((c) => `- ${c.text}`).join("\n");

  const systemPrompt = `คุณเป็นติวเตอร์ผู้เชี่ยวชาญที่ช่วยผู้เข้าสอบเตรียมตัวสอบราชการไทย (ตำแหน่งอาสาพัฒนา กรมการพัฒนาชุมชน)
ภารกิจสำคัญที่สุดของคุณคือ **อธิบายว่าทำไมคำตอบที่ถูกจึงถูก** — ให้เหตุผลว่าเพราะอะไร
ผู้เรียนต้องอ่านแล้วเข้าใจ "เหตุผล" ไม่ใช่แค่รู้ว่าตอบข้อไหน

สำคัญมาก: **ห้ามอ้างถึงตัวเลือกด้วยตัวอักษร ก/ข/ค/ง หรือคำว่า "ข้อ ก/ข/ค/ง" เด็ดขาด**
เพราะระบบจะสลับตำแหน่งตัวเลือกทุกครั้ง ให้อ้างถึงตัวเลือกด้วย "ข้อความของคำตอบ" แทนเสมอ
(เช่น พูดว่า «ตัวเลือกที่ว่า "เลือกปฏิบัติ" ผิดเพราะ...» ไม่ใช่ «ข้อ ค ผิดเพราะ...»)

เขียนคำอธิบายตามโครงสร้างนี้เสมอ (ใช้ภาษาไทย กระชับ เป็นกันเอง):

1. **ทำไมคำตอบนี้จึงถูก:** ให้เหตุผลหลักอย่างชัดเจน อ้างอิงหลักการ นิยาม หรือกฎที่เกี่ยวข้อง
   (2-4 ประโยค) — นี่คือส่วนที่สำคัญที่สุด
2. **ทำไมตัวเลือกอื่นไม่ใช่:** ชี้สั้นๆ ว่าตัวเลือกที่ผิดแต่ละอันผิดตรงไหน โดยอ้างด้วยข้อความของตัวเลือกนั้น
3. **เทคนิคจำ:** คำสั้นๆ / keyword / วิธีเชื่อมโยง ที่ช่วยให้จำคำตอบและเหตุผลนี้ได้

ข้อกำหนด:
- เน้นที่ "เหตุผล" (ทำไม) เสมอ ไม่ใช่แค่บอกว่าถูกหรือผิด
- อ่านจบได้ใน 20-45 วินาที ไม่ยืดเยื้อ
- ตอบเป็นข้อความล้วน ไม่ต้องใส่ JSON`;

  const userPrompt = `หมวด: ${input.category}
คำถาม: ${input.questionText}

ตัวเลือกทั้งหมด:
${choicesBlock}

คำตอบที่ถูกต้องคือ: "${input.correctText}"

กรุณาอธิบายว่าทำไมคำตอบ "${input.correctText}" จึงถูกต้อง โดยอ้างถึงตัวเลือกด้วยข้อความ (ห้ามใช้ตัวอักษร ก/ข/ค/ง)`;

  const completion = await getClient().chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.6,
    max_tokens: 700,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Deepseek returned an empty explanation.");
  }
  return content;
}
