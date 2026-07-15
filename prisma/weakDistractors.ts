// Detect questions whose wrong choices are "too obviously wrong" — i.e. use
// blatant negative filler instead of plausible distractors. Helps target which
// questions need better distractors.
//
//   npm run weak            # list flagged questions + count per category
//   npm run weak -- --keys  # print just the flagged keys (for scripting)
import { bank } from "./bank";

// Phrases that scream "wrong answer" and rarely appear in a believable option.
// A wrong choice consisting largely of these is a weak distractor.
const RED_FLAGS = [
  "ไม่มีประโยชน์",
  "ไม่จำเป็น",
  "ควบคุมประชาชน",
  "สร้างความขัดแย้ง",
  "สร้างความแตกแยก",
  "แบ่งฝักแบ่งฝ่าย",
  "เลือกปฏิบัติ",
  "ขายข้อมูล",
  "เก็บภาษี",
  "แสวงหากำไร",
  "แสวงหาผลประโยชน์",
  "เห็นแก่ตัว",
  "เห็นแก่ประโยชน์ส่วนตน",
  "เพิกเฉย",
  "ปกปิด",
  "รวมศูนย์อำนาจ",
  "ลดการมีส่วนร่วม",
  "ลดประสิทธิภาพ",
  "เพิ่มความเสี่ยง",
  "เพิ่มความขัดแย้ง",
  "เพิ่มความซ้ำซ้อน",
  "ทำให้ล่าช้า",
  "ทำให้ขาดทุน",
  "ทำให้ยุ่งยาก",
  "ทำให้สับสน",
  "ทำลายชุมชน",
  "ทำลายวัฒนธรรม",
  "ทำลายป่า",
  "ตัดไม้ทำลาย",
  "เพิ่มมลพิษ",
  "เพิ่มหนี้",
  "ลดรายได้",
  "ลดการออม",
  "ก่อหนี้",
  "จ่ายเงินเดือนกรรมการ",
  "จ่ายเงินเดือนข้าราชการ",
  "ลงทุนในตลาดหุ้น",
  "ซื้อที่ดิน",
  "ผูกขาด",
  "การพนัน",
  "ผิดกฎหมาย",
  "ปล่อยตามยถากรรม",
  "รอความช่วยเหลือ",
  "พึ่งพารัฐ",
  "พึ่งพาต่างชาติ",
  "กีดกัน",
  "ละเลย",
  "ใช้ความรุนแรง",
  "ใช้กำลัง",
  "ใช้จนหมด",
  "ฟุ่มเฟือย",
  "ตามใจ",
  "ไม่รับฟัง",
  "ไม่สนใจ",
  "ไม่ต้อง",
];

// A choice is a "weak" distractor if it is short and dominated by a red-flag
// phrase (i.e. it's basically just a negative filler).
function isWeak(text: string): boolean {
  const t = text.trim();
  return RED_FLAGS.some((f) => t.includes(f)) && t.length <= 28;
}

const keysOnly = process.argv.includes("--keys");

let flaggedCount = 0;
const byCategory = new Map<string, number>();
const flaggedKeys: string[] = [];

for (const q of bank) {
  const correct = q.choices.find((c) => c.label === q.correct);
  const wrong = q.choices.filter((c) => c.label !== q.correct);
  const weakWrong = wrong.filter((c) => isWeak(c.text));
  // Strict mode: flag when ANY wrong choice is an obvious weak distractor.
  if (weakWrong.length >= 1) {
    flaggedCount++;
    flaggedKeys.push(q.key);
    byCategory.set(q.category, (byCategory.get(q.category) ?? 0) + 1);
    if (!keysOnly) {
      // Show a compact preview of the first few for spot-checking.
      if (flaggedCount <= 12) {
        console.log(`\n[${q.key}] ${q.text}`);
        console.log(`   ✓ ${correct?.text}`);
        weakWrong.forEach((c) => console.log(`   ✗ (weak) ${c.text}`));
      }
    }
  }
}

if (keysOnly) {
  console.log(flaggedKeys.join("\n"));
} else {
  console.log(`\n=== ${flaggedCount}/${bank.length} questions have weak distractors (2+ obvious wrong choices) ===`);
  console.log("By category:");
  for (const [cat, n] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n}  ${cat}`);
  }
}
