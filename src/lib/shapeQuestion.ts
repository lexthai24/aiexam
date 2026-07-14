import { hashSeed, seededShuffle } from "./shuffle";

const LABELS = ["ก", "ข", "ค", "ง"];

// A DB question row with its choices (as loaded via `include: { choices: true }`).
interface RawChoice {
  id: number;
  label: string;
  text: string;
  order: number;
}
interface RawQuestion {
  id: number;
  number: number;
  category: string;
  text: string;
  choices: RawChoice[];
}

// Shape a question for the client: shuffle the choice ORDER deterministically by
// seed and RE-LABEL them ก/ข/ค/ง by their new position. This fixes answer-key
// bias (e.g. the correct answer always being ก) — the correct choice now lands
// in a different position each round while the choice text stays intact.
//
// Grading uses the stable choice `id`, so the shuffled display labels don't
// affect correctness. `isCorrect` is never included in the output.
export function shapeQuestionForClient(q: RawQuestion, seed: number) {
  const shuffled = seededShuffle(q.choices, seed ^ hashSeed("choice") ^ q.id);
  return {
    id: q.id,
    number: q.number,
    category: q.category,
    text: q.text,
    choices: shuffled.map((c, i) => ({
      id: c.id,
      label: LABELS[i], // positional label after shuffle
      text: c.text,
    })),
  };
}
