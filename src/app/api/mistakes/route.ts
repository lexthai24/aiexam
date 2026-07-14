import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSeed, seededShuffle } from "@/lib/shuffle";
import { shapeQuestionForClient } from "@/lib/shapeQuestion";

const ROUND_SIZE = 100;

// GET /api/mistakes?userId=<n>&seed=<string>
// Returns the questions this user most recently answered INCORRECTLY, shaped
// like /api/questions (no isCorrect), randomized per seed and capped at
// ROUND_SIZE. A question counts as a "mistake" only if the user's LATEST
// attempt on it was wrong (so questions they later got right are excluded).
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get("userId"));
    const seedParam = searchParams.get("seed") || "default";
    if (!Number.isInteger(userId)) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Latest-first so the first attempt we see per question is the most recent.
    const attempts = await prisma.attempt.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { questionId: true, isCorrect: true },
    });

    const latestByQuestion = new Map<number, boolean>();
    for (const a of attempts) {
      if (!latestByQuestion.has(a.questionId)) {
        latestByQuestion.set(a.questionId, a.isCorrect);
      }
    }
    const wrongIds = [...latestByQuestion.entries()]
      .filter(([, correct]) => !correct)
      .map(([qid]) => qid);

    if (wrongIds.length === 0) {
      return NextResponse.json({ questions: [], total: 0 });
    }

    const rows = await prisma.question.findMany({
      where: { id: { in: wrongIds } },
      include: { choices: true },
    });

    const seed = hashSeed(`mistakes:${seedParam}`);
    const selected = seededShuffle(rows, seed).slice(0, ROUND_SIZE);

    const questions = selected.map((q) => shapeQuestionForClient(q, seed));

    return NextResponse.json({ questions, total: wrongIds.length });
  } catch (err) {
    console.error("GET /api/mistakes failed:", err);
    return NextResponse.json(
      { error: "โหลดข้อที่ตอบผิดไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
