// Utility: delete cached AI explanations so they get regenerated on next view.
// Useful after changing the Deepseek prompt.
//
//   npm run clear:explanations            # clear all
//   npm run clear:explanations -- 1 2 3   # clear specific question ids
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({
    connectionString:
      process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  const ids = process.argv
    .slice(2)
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n));

  const where = ids.length ? { questionId: { in: ids } } : {};
  const del = await prisma.explanation.deleteMany({ where });
  console.log(
    ids.length
      ? `Cleared explanations for questions ${ids.join(", ")}: ${del.count}`
      : `Cleared all cached explanations: ${del.count}`
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
