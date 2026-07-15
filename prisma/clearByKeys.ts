// Clear cached explanations for questions listed by KEY in a file (one per line).
// Used after distractor edits so only edited questions get regenerated.
//
//   npx tsx prisma/clearByKeys.ts <keysFile>
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { readFileSync } from "fs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const keysFile = process.argv[2];
  if (!keysFile) {
    console.error("usage: tsx prisma/clearByKeys.ts <keysFile>");
    process.exit(1);
  }
  const keys = readFileSync(keysFile, "utf8")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const adapter = new PrismaPg({
    connectionString: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  // Resolve keys -> question ids, then delete those explanations.
  const questions = await prisma.question.findMany({
    where: { key: { in: keys } },
    select: { id: true },
  });
  const ids = questions.map((q) => q.id);
  const del = await prisma.explanation.deleteMany({
    where: { questionId: { in: ids } },
  });
  console.log(`Matched ${ids.length} questions; cleared ${del.count} explanations.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
