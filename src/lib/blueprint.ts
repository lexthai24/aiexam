// Exam blueprint: the proportional weight of each category, mirroring the real
// อสพ. exam's topic distribution. Used to build an exam round whose category mix
// matches the real test instead of a flat random draw.
//
// Weights are relative (they need not sum to 100); the sampler allocates the
// round size proportionally and fills any remainder from the largest pools.
export const CATEGORY_WEIGHTS: { category: string; weight: number }[] = [
  { category: "พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562", weight: 8 },
  {
    category:
      "ยุทธศาสตร์ชาติ นโยบายกระทรวงมหาดไทย และงานสำคัญของกรมการพัฒนาชุมชน",
    weight: 8,
  },
  { category: "ระเบียบและการปฏิบัติงานของอาสาพัฒนา", weight: 7 },
  { category: "ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ", weight: 8 },
  { category: "ความรู้เกี่ยวกับกรมการพัฒนาชุมชน", weight: 7 },
  { category: "แนวคิด หลักการ กระบวนการ และวิธีปฏิบัติงานพัฒนาชุมชน", weight: 10 },
  { category: "การพัฒนาเศรษฐกิจฐานราก", weight: 7 },
  { category: "โครงการหนึ่งตำบล หนึ่งผลิตภัณฑ์ (OTOP)", weight: 7 },
  { category: "ทุนชุมชนและกองทุนพัฒนาบทบาทสตรี", weight: 6 },
  { category: "ความรู้เกี่ยวกับหมู่บ้านและชุมชน", weight: 6 },
  { category: "ข้อมูลสารสนเทศเพื่อการพัฒนาชุมชน", weight: 5 },
  { category: "การจัดการความยากจนและการพัฒนาคนทุกช่วงวัย", weight: 6 },
  {
    category: "การป้องกันและแก้ไขปัญหายาเสพติดโดยกองทุนแม่ของแผ่นดิน",
    weight: 5,
  },
  {
    category: "ความรู้ทั่วไปด้านเศรษฐกิจ สังคม การเมือง และสถานการณ์ร่วมสมัย",
    weight: 10,
  },
];

const totalWeight = CATEGORY_WEIGHTS.reduce((s, c) => s + c.weight, 0);

// How many questions to draw from each category for a round of `roundSize`,
// given how many are actually available per category (`available`). Allocates
// proportionally, never asks for more than a category has, and distributes any
// leftover slots to the categories with the most remaining questions.
export function allocateByBlueprint(
  roundSize: number,
  available: Map<string, number>
): Map<string, number> {
  const alloc = new Map<string, number>();
  let assigned = 0;

  for (const { category, weight } of CATEGORY_WEIGHTS) {
    const have = available.get(category) ?? 0;
    const want = Math.min(have, Math.floor((roundSize * weight) / totalWeight));
    alloc.set(category, want);
    assigned += want;
  }

  // Distribute remaining slots to categories that still have spare questions,
  // ordered by how many they have left (largest pools first).
  let remaining = roundSize - assigned;
  if (remaining > 0) {
    const spare = CATEGORY_WEIGHTS.map(({ category }) => ({
      category,
      left: (available.get(category) ?? 0) - (alloc.get(category) ?? 0),
    }))
      .filter((c) => c.left > 0)
      .sort((a, b) => b.left - a.left);

    let i = 0;
    while (remaining > 0 && spare.length > 0) {
      const c = spare[i % spare.length];
      if (c.left > 0) {
        alloc.set(c.category, (alloc.get(c.category) ?? 0) + 1);
        c.left--;
        remaining--;
      }
      i++;
      if (i > 10000) break; // safety
    }
  }

  return alloc;
}
