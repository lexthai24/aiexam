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

  // Small retry helper — the direct connection can drop on large/long queries.
  async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < 5; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        console.warn(`retry ${label} (${i + 1}/5): ${(err as Error).message}`);
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
      }
    }
    throw lastErr;
  }

  // Load questions+choices in PAGES to avoid one huge query dropping the
  // connection. Each page is retried independently.
  const total = await withRetry(() => prisma.question.count(), "count");
  const PAGE = 100;
  const questions: Awaited<
    ReturnType<typeof prisma.question.findMany<{ include: { choices: true } }>>
  > = [];
  for (let skip = 0; skip < total; skip += PAGE) {
    const page = await withRetry(
      () =>
        prisma.question.findMany({
          include: { choices: true },
          orderBy: { number: "asc" },
          skip,
          take: PAGE,
        }),
      `page@${skip}`
    );
    questions.push(...page);
  }

  // Which questions still need an explanation?
  const existing = new Set(
    force
      ? []
      : (
          await withRetry(
            () => prisma.explanation.findMany({ select: { questionId: true } }),
            "existing"
          )
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
