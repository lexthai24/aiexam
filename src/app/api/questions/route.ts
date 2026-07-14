import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSeed, seededShuffle } from "@/lib/shuffle";
import { allocateByBlueprint } from "@/lib/blueprint";

// How many questions make up one exam round, no matter how many exist in total.
const ROUND_SIZE = 100;

// GET /api/questions?seed=<string>&limit=<n>
// Returns a randomized selection of questions (up to ROUND_SIZE) for one exam
// round, with the CATEGORY MIX weighted to match the real exam blueprint. The
// order is RANDOM but DETERMINISTIC per `seed`, so reloading mid-quiz keeps the
// same set/order; a new seed gives a different set. `isCorrect` is never sent —
// grading happens server-side in /api/answer.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seedParam = searchParams.get("seed") || "default";
    const limit = Math.max(
      1,
      Math.min(ROUND_SIZE, Number(searchParams.get("limit")) || ROUND_SIZE)
    );
    const seed = hashSeed(seedParam);

    const rows = await prisma.question.findMany({
      include: { choices: true },
    });

    // Group the pool by category, then allocate slots per the blueprint and pick
    // that many from each category (deterministically shuffled by seed).
    const byCategory = new Map<string, typeof rows>();
    for (const r of rows) {
      const arr = byCategory.get(r.category) ?? [];
      arr.push(r);
      byCategory.set(r.category, arr);
    }
    const available = new Map(
      [...byCategory.entries()].map(([cat, arr]) => [cat, arr.length])
    );
    const alloc = allocateByBlueprint(limit, available);

    let picked: typeof rows = [];
    for (const [cat, arr] of byCategory) {
      const take = alloc.get(cat) ?? 0;
      if (take > 0) picked = picked.concat(seededShuffle(arr, seed ^ hashSeed(cat)).slice(0, take));
    }
    // Shuffle the combined selection so categories are interleaved, not grouped.
    const selected = seededShuffle(picked, seed);

    const questions = selected.map((q) => ({
      id: q.id,
      number: q.number,
      category: q.category,
      text: q.text,
      choices: [...q.choices]
        .sort((a, b) => a.order - b.order)
        .map((c) => ({ id: c.id, label: c.label, text: c.text })),
    }));

    return NextResponse.json({ questions, total: rows.length });
  } catch (err) {
    console.error("GET /api/questions failed:", err);
    return NextResponse.json(
      {
        error:
          "โหลดข้อสอบไม่สำเร็จ — ตรวจสอบการเชื่อมต่อฐานข้อมูล (DATABASE_URL) บนเซิร์ฟเวอร์",
      },
      { status: 500 }
    );
  }
}
