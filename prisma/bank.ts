// The full question bank: combines the original core 100 with the additional
// Opus-authored category files, assigns sequential `number`s, and is the single
// source consumed by the seed script.
//
// To add more questions: create/extend a file in prisma/data/, import it here,
// and add it to the `sources` array. Re-run `npm run seed`.
import type { SeedQuestion } from "./data/shared";
import { questions as coreQuestions } from "./questions";
import { docsQuestions } from "./data/docs";
import { pdpaQuestions } from "./data/pdpa";
import { processQuestions } from "./data/process";
import { generalQuestions } from "./data/general";
import { strategyQuestions } from "./data/strategy";
import { otopQuestions } from "./data/otop";
import { economyQuestions } from "./data/economy";
import { volunteerQuestions } from "./data/volunteer";
import { cddQuestions } from "./data/cdd";
import { fundQuestions } from "./data/fund";
import { villageQuestions } from "./data/village";
import { infoQuestions } from "./data/info";
import { povertyQuestions } from "./data/poverty";
import { drugsQuestions } from "./data/drugs";
import { topup1Questions } from "./data/topup1";
import { topup2Questions } from "./data/topup2";

// Order matters only for the display `number`; sampling randomizes anyway.
const sources: SeedQuestion[][] = [
  coreQuestions as unknown as SeedQuestion[],
  docsQuestions,
  pdpaQuestions,
  processQuestions,
  generalQuestions,
  strategyQuestions,
  otopQuestions,
  economyQuestions,
  volunteerQuestions,
  cddQuestions,
  fundQuestions,
  villageQuestions,
  infoQuestions,
  povertyQuestions,
  drugsQuestions,
  topup1Questions,
  topup2Questions,
];

// Flatten and assign sequential numbers (1..N) across the whole bank.
export const bank: SeedQuestion[] = sources
  .flat()
  .map((question, i) => ({ ...question, number: i + 1 }));
