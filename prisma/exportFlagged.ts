// Export all weak-distractor-flagged questions as JSON, grouped by the data
// file they live in, so a workflow can hand each file's flagged questions to an
// agent for rewriting.
import { bank } from "./bank";

const RED_FLAGS = [
  "ไม่มีประโยชน์","ไม่จำเป็น","ควบคุมประชาชน","สร้างความขัดแย้ง","สร้างความแตกแยก",
  "แบ่งฝักแบ่งฝ่าย","เลือกปฏิบัติ","ขายข้อมูล","เก็บภาษี","แสวงหากำไร","แสวงหาผลประโยชน์",
  "เห็นแก่ตัว","เห็นแก่ประโยชน์ส่วนตน","เพิกเฉย","ปกปิด","รวมศูนย์อำนาจ","ลดการมีส่วนร่วม",
  "ลดประสิทธิภาพ","เพิ่มความเสี่ยง","เพิ่มความขัดแย้ง","เพิ่มความซ้ำซ้อน","ทำให้ล่าช้า",
  "ทำให้ขาดทุน","ทำให้ยุ่งยาก","ทำให้สับสน","ทำลายชุมชน","ทำลายวัฒนธรรม","ทำลายป่า",
  "ตัดไม้ทำลาย","เพิ่มมลพิษ","เพิ่มหนี้","ลดรายได้","ลดการออม","ก่อหนี้",
  "จ่ายเงินเดือนกรรมการ","จ่ายเงินเดือนข้าราชการ","ลงทุนในตลาดหุ้น","ซื้อที่ดิน","ผูกขาด",
  "การพนัน","ผิดกฎหมาย","ปล่อยตามยถากรรม","รอความช่วยเหลือ","พึ่งพารัฐ","พึ่งพาต่างชาติ",
  "กีดกัน","ละเลย","ใช้ความรุนแรง","ใช้กำลัง","ใช้จนหมด","ฟุ่มเฟือย","ตามใจ","ไม่รับฟัง",
  "ไม่สนใจ","ไม่ต้อง",
];
const isWeak = (t: string) => {
  const s = t.trim();
  return RED_FLAGS.some((f) => s.includes(f)) && s.length <= 28;
};

// Map a question key prefix to its data file.
function fileOf(key: string): string {
  if (/^q\d+$/.test(key)) return "questions"; // original core file
  const prefix = key.split("-")[0];
  const map: Record<string, string> = {
    docs: "docs", pdpa: "pdpa", proc: "process", gen: "general", strat: "strategy",
    otop: "otop", econ: "economy", vol: "volunteer", cdd: "cdd", fund: "fund",
    vil: "village", info: "info", pov: "poverty", drug: "drugs",
  };
  return map[prefix] ?? prefix;
}

const byFile: Record<string, unknown[]> = {};
for (const q of bank) {
  const wrong = q.choices.filter((c) => c.label !== q.correct);
  if (wrong.filter((c) => isWeak(c.text)).length < 1) continue;
  const correctText = q.choices.find((c) => c.label === q.correct)!.text;
  const f = fileOf(q.key);
  (byFile[f] ??= []).push({
    key: q.key,
    text: q.text,
    correctText,
    weakChoices: wrong.filter((c) => isWeak(c.text)).map((c) => c.text),
    allChoices: q.choices.map((c) => c.text),
  });
}

console.log(JSON.stringify(byFile));
