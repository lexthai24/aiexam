// Validate the question bank before seeding:
//   - unique keys
//   - no duplicate / near-duplicate question text (normalized)
//   - exactly 4 choices labelled ก ข ค ง, all non-empty
//   - the `correct` label exists among the choices
//   - report category counts vs. the blueprint targets
//
//   npm run validate
import { bank } from "./bank";
import { CATEGORY_TARGETS } from "./data/shared";

// Normalize Thai text for duplicate detection: drop spaces, quotes, punctuation.
function norm(s: string): string {
  return s
    .replace(/[\s“”"'’‘.।ๆฯ]/g, "")
    .replace(/[?？]/g, "")
    .toLowerCase()
    .trim();
}

let errors = 0;
const warn = (m: string) => {
  console.warn("⚠️  " + m);
  errors++;
};

// 1. Unique keys
const keySeen = new Map<string, number>();
bank.forEach((q, i) => {
  if (keySeen.has(q.key)) warn(`duplicate key "${q.key}" (#${i + 1})`);
  keySeen.set(q.key, i);
});

// 2. Duplicate / near-duplicate question text
const textSeen = new Map<string, string>();
for (const q of bank) {
  const n = norm(q.text);
  if (textSeen.has(n)) {
    warn(`duplicate question text: "${q.text}" (keys ${textSeen.get(n)} & ${q.key})`);
  } else {
    textSeen.set(n, q.key);
  }
}

// 3. Structure: 4 labelled choices, non-empty, correct label present
const LABELS = ["ก", "ข", "ค", "ง"];
for (const q of bank) {
  if (q.choices.length !== 4) warn(`${q.key}: has ${q.choices.length} choices (need 4)`);
  const labels = q.choices.map((c) => c.label);
  if (LABELS.some((l) => !labels.includes(l)))
    warn(`${q.key}: choice labels must be exactly ก ข ค ง`);
  if (q.choices.some((c) => !c.text.trim())) warn(`${q.key}: has an empty choice`);
  if (!q.text.trim()) warn(`${q.key}: empty question text`);
  if (!labels.includes(q.correct))
    warn(`${q.key}: correct label "${q.correct}" not among choices`);
  // Detect duplicate choice texts within a question.
  const ctexts = q.choices.map((c) => norm(c.text));
  if (new Set(ctexts).size !== ctexts.length)
    warn(`${q.key}: has duplicate choice texts`);
}

// 4. Category distribution vs targets
console.log(`\nTotal questions: ${bank.length}\n`);
console.log("Category distribution (current / target):");
const counts = new Map<string, number>();
for (const q of bank) counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
for (const { category, target } of CATEGORY_TARGETS) {
  const n = counts.get(category) ?? 0;
  const mark = n >= target ? "✓" : " ";
  console.log(`  ${mark} ${n}/${target}  ${category}`);
}
// Any categories present but not in the blueprint?
for (const cat of counts.keys()) {
  if (!CATEGORY_TARGETS.some((t) => t.category === cat))
    warn(`category not in blueprint: "${cat}"`);
}

console.log(
  errors === 0
    ? "\n✅ Validation passed — no problems found."
    : `\n❌ Validation found ${errors} problem(s).`
);
process.exit(errors === 0 ? 0 : 1);
