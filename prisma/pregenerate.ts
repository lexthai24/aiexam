// Pre-generate AI explanations for every question and cache them in the DB.
//
// Run this after seeding (or after adding new questions) so that at quiz time
// every explanation is already stored and served instantly from cache — no
// waiting on Deepseek and no quota spent during real use.
//
//   npm run pregenerate            # generate for questions missing an explanation
//   npm run pregenerate -- --force # regenerate ALL (overwrite existing)
//
// It is safe to re-run: by default it skips questions that already have a
// cached explanation, so it only spends quota on what's missing.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateExplanation, getModel } from "../src/lib/deepseek";

const CONCURRENCY = 4; // how many Deepseek calls to run at once

async function main() {
  const force = process.argv.includes("--force");

  const adapter = new PrismaPg({
    connectionString:
      process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  const questions = await prisma.question.findMany({
    include: { choices: true },
  });
  questions.sort((a, b) => a.number - b.number);

  // Which questions still need an explanation?
  const existing = new Set(
    force
      ? []
      : (
          await prisma.explanation.findMany({ select: { questionId: true } })
        ).map((e) => e.questionId)
  );

  const todo = questions.filter((q) => !existing.has(q.id));
  console.log(
    `Total questions: ${questions.length} | already cached: ${
      questions.length - todo.length
    } | to generate: ${todo.length}${force ? " (force)" : ""}`
  );

  let done = 0;
  let failed = 0;

  // Simple concurrency pool.
  async function worker(items: typeof todo) {
    for (const q of items) {
      const correct = q.choices.find((c) => c.isCorrect);
      if (!correct) {
        console.warn(`! q${q.number}: no correct choice, skipping`);
        continue;
      }
      try {
        const content = await generateExplanation({
          category: q.category,
          questionNumber: q.number,
          questionText: q.text,
          choices: [...q.choices]
            .sort((a, b) => a.order - b.order)
            .map((c) => ({ label: c.label, text: c.text })),
          correctLabel: correct.label,
          correctText: correct.text,
        });
        await prisma.explanation.upsert({
          where: { questionId: q.id },
          create: { questionId: q.id, content, model: getModel() },
          update: { content, model: getModel() },
        });
        done++;
        console.log(`✓ q${q.number} (${done}/${todo.length})`);
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`✗ q${q.number}: ${msg}`);
      }
    }
  }

  // Split todo across CONCURRENCY workers (round-robin).
  const buckets: (typeof todo)[] = Array.from({ length: CONCURRENCY }, () => []);
  todo.forEach((q, i) => buckets[i % CONCURRENCY].push(q));
  await Promise.all(buckets.map((b) => worker(b)));

  console.log(`\nDone. Generated: ${done}, failed: ${failed}.`);
  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
