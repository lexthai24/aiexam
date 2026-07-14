import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/answer
// Body: { questionId: number, choiceId: number, userId: number }
// Grades by the stable choice `id` (not the display label, which is shuffled per
// round), records the attempt, and returns whether it was correct plus the
// correct choice's id so the UI can highlight it.
export async function POST(req: NextRequest) {
  let body: { questionId?: number; choiceId?: number; userId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { questionId, choiceId, userId } = body;
  if (
    typeof questionId !== "number" ||
    typeof choiceId !== "number" ||
    typeof userId !== "number"
  ) {
    return NextResponse.json(
      { error: "questionId, choiceId and userId are required" },
      { status: 400 }
    );
  }

  try {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        choices: { select: { id: true, label: true, text: true, isCorrect: true } },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const correctChoice = question.choices.find((c) => c.isCorrect);
    const chosenChoice = question.choices.find((c) => c.id === choiceId);
    if (!correctChoice) {
      return NextResponse.json(
        { error: "Question has no correct answer configured" },
        { status: 500 }
      );
    }
    if (!chosenChoice) {
      return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
    }

    const isCorrect = chosenChoice.id === correctChoice.id;

    await prisma.attempt.create({
      // Store the choice's canonical label for the record (not the shuffled one).
      data: { userId, questionId, chosenLabel: chosenChoice.label, isCorrect },
    });

    return NextResponse.json({
      isCorrect,
      correctChoiceId: correctChoice.id,
      correctText: correctChoice.text,
    });
  } catch (err) {
    console.error("POST /api/answer failed:", err);
    return NextResponse.json(
      { error: "ตรวจคำตอบไม่สำเร็จ กรุณาลองใหม่" },
      { status: 500 }
    );
  }
}
