import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/answer
// Body: { questionId: number, chosenLabel: string, sessionId: string }
// Grades the answer server-side, records the attempt, and returns whether it
// was correct along with the correct label/text so the UI can give feedback.
export async function POST(req: NextRequest) {
  let body: { questionId?: number; chosenLabel?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { questionId, chosenLabel, sessionId } = body;
  if (
    typeof questionId !== "number" ||
    typeof chosenLabel !== "string" ||
    typeof sessionId !== "string"
  ) {
    return NextResponse.json(
      { error: "questionId, chosenLabel and sessionId are required" },
      { status: 400 }
    );
  }

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      choices: { select: { label: true, text: true, isCorrect: true } },
    },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const correctChoice = question.choices.find((c) => c.isCorrect);
  if (!correctChoice) {
    return NextResponse.json(
      { error: "Question has no correct answer configured" },
      { status: 500 }
    );
  }

  const isCorrect = chosenLabel === correctChoice.label;

  await prisma.attempt.create({
    data: { sessionId, questionId, chosenLabel, isCorrect },
  });

  return NextResponse.json({
    isCorrect,
    correctLabel: correctChoice.label,
    correctText: correctChoice.text,
  });
}
