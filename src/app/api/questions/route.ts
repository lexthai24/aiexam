import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSeed, seededShuffle } from "@/lib/shuffle";

// How many questions make up one exam round, no matter how many exist in total.
const ROUND_SIZE = 100;

// GET /api/questions?seed=<string>&limit=<n>
// Returns a randomized selection of questions (up to ROUND_SIZE) for one exam
// round. The order is RANDOM but DETERMINISTIC per `seed`, so reloading mid-quiz
// keeps the same questions/order; starting a new round passes a new seed to get
// a different selection and order. The `isCorrect` flag is never sent — grading
// happens server-side in /api/answer.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const seedParam = searchParams.get("seed") || "default";
    const limit = Math.max(
      1,
      Math.min(
        ROUND_SIZE,
        Number(searchParams.get("limit")) || ROUND_SIZE
      )
    );
    const seed = hashSeed(seedParam);

    const rows = await prisma.question.findMany({
      include: { choices: true },
    });

    // Randomize the whole pool deterministically, then take the first `limit`.
    // Choices keep their natural ก→ง order (the labels imply order in Thai
    // exams); only the QUESTION order is randomized.
    const selected = seededShuffle(rows, seed).slice(0, limit);

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
