// Shared types, category constants, and the q() helper used by every
// question data file. Keeping these in one place lets category files stay small
// and consistent.

export interface SeedChoice {
  label: string;
  text: string;
}

export interface SeedQuestion {
  key: string;
  number: number;
  category: string;
  text: string;
  choices: SeedChoice[];
  correct: string; // label of the correct choice
}

// Canonical category names, aligned to the 14 หัวข้อ of the exam blueprint.
export const C = {
  PDPA: "พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562",
  STRATEGY: "ยุทธศาสตร์ชาติ นโยบายกระทรวงมหาดไทย และงานสำคัญของกรมการพัฒนาชุมชน",
  VOLUNTEER: "ระเบียบและการปฏิบัติงานของอาสาพัฒนา",
  DOCS: "ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ",
  CDD: "ความรู้เกี่ยวกับกรมการพัฒนาชุมชน",
  PROCESS: "แนวคิด หลักการ กระบวนการ และวิธีปฏิบัติงานพัฒนาชุมชน",
  ECONOMY: "การพัฒนาเศรษฐกิจฐานราก",
  OTOP: "โครงการหนึ่งตำบล หนึ่งผลิตภัณฑ์ (OTOP)",
  FUND: "ทุนชุมชนและกองทุนพัฒนาบทบาทสตรี",
  VILLAGE: "ความรู้เกี่ยวกับหมู่บ้านและชุมชน",
  INFO: "ข้อมูลสารสนเทศเพื่อการพัฒนาชุมชน",
  POVERTY: "การจัดการความยากจนและการพัฒนาคนทุกช่วงวัย",
  DRUGS: "การป้องกันและแก้ไขปัญหายาเสพติดโดยกองทุนแม่ของแผ่นดิน",
  GENERAL: "ความรู้ทั่วไปด้านเศรษฐกิจ สังคม การเมือง และสถานการณ์ร่วมสมัย",
} as const;

// Blueprint: target number of questions per category for a 1000-question bank,
// derived from the real exam's topic weighting. Also used for weighted sampling
// when building an exam round.
export const CATEGORY_TARGETS: { category: string; target: number }[] = [
  { category: C.PDPA, target: 80 },
  { category: C.STRATEGY, target: 80 },
  { category: C.VOLUNTEER, target: 70 },
  { category: C.DOCS, target: 80 },
  { category: C.CDD, target: 70 },
  { category: C.PROCESS, target: 100 },
  { category: C.ECONOMY, target: 70 },
  { category: C.OTOP, target: 70 },
  { category: C.FUND, target: 60 },
  { category: C.VILLAGE, target: 60 },
  { category: C.INFO, target: 50 },
  { category: C.POVERTY, target: 60 },
  { category: C.DRUGS, target: 50 },
  { category: C.GENERAL, target: 100 },
];

const L = ["ก", "ข", "ค", "ง"];

// Build a question. `key` must be globally unique (used for idempotent seeding).
export function q(
  key: string,
  category: string,
  text: string,
  choiceTexts: [string, string, string, string],
  correct: string
): SeedQuestion {
  return {
    key,
    number: 0, // assigned sequentially when the full bank is assembled
    category,
    text,
    choices: choiceTexts.map((t, i) => ({ label: L[i], text: t })),
    correct,
  };
}
