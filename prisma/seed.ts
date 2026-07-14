// Seed runner. Idempotent: safe to run multiple times.
//
// Uses a DIRECT Postgres connection (DIRECT_DATABASE_URL) rather than the
// Accelerate URL, because bulk seeding is simpler/cheaper over a direct
// connection and does not require the Accelerate extension.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { questions } from "./questions";

// Seed over a direct Postgres connection using the pg driver adapter.
const connectionString =
  process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`Seeding ${questions.length} questions...`);

  for (const item of questions) {
    // Upsert the question by its stable key so re-running updates in place.
    const question = await prisma.question.upsert({
      where: { key: item.key },
      update: {
        number: item.number,
        category: item.category,
        text: item.text,
      },
      create: {
        key: item.key,
        number: item.number,
        category: item.category,
        text: item.text,
      },
    });

    // Replace choices for this question to keep them in sync with the seed.
    await prisma.choice.deleteMany({ where: { questionId: question.id } });
    await prisma.choice.createMany({
      data: item.choices.map((c, idx) => ({
        questionId: question.id,
        label: c.label,
        text: c.text,
        isCorrect: c.label === item.correct,
        order: idx,
      })),
    });
  }

  const total = await prisma.question.count();
  console.log(`Done. Database now holds ${total} questions.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
