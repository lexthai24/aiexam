import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/questions
// Returns all questions with their choices, ordered by question number.
// The `isCorrect` flag is intentionally omitted so the answer key is never
// shipped to the client — correctness is checked server-side in /api/answer.
export async function GET() {
  const rows = await prisma.question.findMany({
    include: { choices: true },
  });

  // Shape the response and strip `isCorrect` so the answer key never reaches the
  // client. Questions and choices are sorted in JS (an `orderBy` combined with
  // `include` currently breaks type inference on the extended Prisma client).
  const questions = [...rows]
    .sort((a, b) => a.number - b.number)
    .map((q) => ({
      id: q.id,
      number: q.number,
      category: q.category,
      text: q.text,
      choices: [...q.choices]
        .sort((a, b) => a.order - b.order)
        .map((c) => ({ id: c.id, label: c.label, text: c.text })),
    }));

  return NextResponse.json({ questions });
}
