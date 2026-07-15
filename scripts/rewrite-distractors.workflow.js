export const meta = {
  name: 'rewrite-distractors',
  description: 'Rewrite weak multiple-choice distractors to be plausible across all category files',
  phases: [{ title: 'Rewrite' }, { title: 'Verify' }],
};

// Flagged keys per data file. args may arrive as an object or a JSON string;
// normalize both.
let parsed = args;
if (typeof parsed === 'string') {
  try { parsed = JSON.parse(parsed); } catch { parsed = {}; }
}
const files = (parsed && parsed.files) || {};

const PATCH_SCHEMA = {
  type: 'object',
  properties: {
    patches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          choices: {
            type: 'array',
            items: { type: 'string' },
            minItems: 4,
            maxItems: 4,
            description: 'The 4 choice texts in display order (position 0=ก .. 3=ง)',
          },
          correct: {
            type: 'string',
            enum: ['ก', 'ข', 'ค', 'ง'],
            description: 'Label of the position holding the correct answer',
          },
        },
        required: ['key', 'choices', 'correct'],
        additionalProperties: false,
      },
    },
  },
  required: ['patches'],
  additionalProperties: false,
};

function prompt(fileBase, keys) {
  return `You are improving a Thai civil-service exam question bank (ตำแหน่งอาสาพัฒนา กรมการพัฒนาชุมชน).

Read the file prisma/data/${fileBase}.ts. It contains questions built with
q("key", CATEGORY, "question text", ["choice ก","choice ข","choice ค","choice ง"], "correctLabel").

PROBLEM: these questions have WEAK distractors — the wrong choices are obviously
wrong (blatant negatives like "ไม่มีประโยชน์", "ควบคุมประชาชน", "สร้างความขัดแย้ง",
"เก็บภาษี", "เลือกปฏิบัติ"). This makes the correct answer guessable.

TASK: For ONLY these keys: ${keys.join(', ')}
Rewrite the THREE wrong choices to be PLAUSIBLE distractors — believable,
on-topic alternatives that a test-taker could mistake for correct, but are still
clearly not the best answer. Techniques: partially-correct statements, right
concept applied to the wrong situation, plausible-but-secondary reasons, common
misconceptions, swapped steps/definitions, near-miss facts.

STRICT RULES:
- Keep the CORRECT answer's TEXT exactly as-is (do not reword it).
- Keep the question text exactly as-is.
- You MAY place the correct answer in any of the 4 positions; report which
  position (ก/ข/ค/ง) holds it via "correct".
- Each of the 3 new distractors must be clearly WRONG (not a second correct
  answer), on-topic, and NOT use blatant negative filler.
- All 4 choices must be distinct and roughly similar in length/specificity.
- Thai language, concise.
- Output one patch per key. Choices array is in display order (index 0 = ก).

Return { patches: [{ key, choices:[4 texts], correct }] } for every listed key.`;
}

const entries = Object.entries(files).filter(([, keys]) => keys && keys.length);

const results = await pipeline(
  entries,
  ([fileBase, keys]) =>
    agent(prompt(fileBase, keys), {
      label: `rewrite:${fileBase}`,
      phase: 'Rewrite',
      schema: PATCH_SCHEMA,
      effort: 'high',
    }).then((r) => ({ fileBase, patches: (r && r.patches) || [], expected: keys })),
  // Verify each file's patches: adversarially check that distractors are truly
  // wrong and plausible, correct text preserved.
  (out, [fileBase]) =>
    agent(
      `You are QA for a Thai exam bank. For file prisma/data/${fileBase}.ts, here are proposed rewritten questions:\n\n` +
        JSON.stringify(out.patches, null, 2) +
        `\n\nRead the original file to confirm each patch's correct-answer TEXT still matches the original question's correct answer. Flag any patch where: (a) a distractor is actually also correct, (b) the correct text was changed, (c) choices are duplicated, or (d) a distractor still uses blatant negative filler. Return the SAME structure { patches: [...] } but with problems FIXED. Keep every key.`,
      { label: `verify:${fileBase}`, phase: 'Verify', schema: PATCH_SCHEMA, effort: 'high' }
    ).then((v) => ({ fileBase, patches: (v && v.patches) || out.patches, expected: out.expected }))
);

return results.filter(Boolean);
