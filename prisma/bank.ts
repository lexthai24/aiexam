// The full question bank: combines the original core 100 with the additional
// Opus-authored category files, assigns sequential `number`s, and is the single
// source consumed by the seed script.
//
// To add more questions: create/extend a file in prisma/data/, import it here,
// and add it to the `sources` array. Re-run `npm run seed`.
import type { SeedQuestion } from "./data/shared";
import { questions as coreQuestions } from "./questions";
import { docsQuestions } from "./data/docs";

// Order matters only for the display `number`; sampling randomizes anyway.
const sources: SeedQuestion[][] = [
  coreQuestions as unknown as SeedQuestion[],
  docsQuestions,
];

// Flatten and assign sequential numbers (1..N) across the whole bank.
export const bank: SeedQuestion[] = sources
  .flat()
  .map((question, i) => ({ ...question, number: i + 1 }));
