import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateExplanation, getModel } from "@/lib/deepseek";

// GET /api/explanation/:questionId
// Returns the AI explanation for a question.
//
// Quota-saving cache: if an explanation already exists in the database we
// return it immediately WITHOUT calling Deepseek. Only the first request for a
// given question ever spends API quota; every request after that is free.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId: questionIdParam } = await params;
  const questionId = Number(questionIdParam);
  if (!Number.isInteger(questionId)) {
    return NextResponse.json({ error: "Invalid question id" }, { status: 400 });
  }

  // 1. Serve from cache if we already have an explanation.
  const cached = await prisma.explanation.findUnique({
    where: { questionId },
    select: { content: true, model: true, createdAt: true },
  });
  if (cached) {
    return NextResponse.json({
      explanation: cached.content,
      model: cached.model,
      cached: true,
    });
  }

  // 2. Otherwise load the question and generate a fresh explanation.
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { choices: true },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Sort choices by display order in JS (a nested `orderBy` inside `include`
  // currently breaks type inference on the extended Prisma client).
  const choices = [...question.choices].sort((a, b) => a.order - b.order);
  const correct = choices.find((c) => c.isCorrect);
  if (!correct) {
    return NextResponse.json(
      { error: "Question has no correct answer configured" },
      { status: 500 }
    );
  }

  let content: string;
  try {
    content = await generateExplanation({
      category: question.category,
      questionNumber: question.number,
      questionText: question.text,
      choices: choices.map((c) => ({ label: c.label, text: c.text })),
      correctLabel: correct.label,
      correctText: correct.text,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate explanation";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // 3. Persist so we never pay for this question again.
  //    upsert guards against a race where two requests generate concurrently.
  const saved = await prisma.explanation.upsert({
    where: { questionId },
    create: { questionId, content, model: getModel() },
    update: {}, // keep the first explanation we stored
    select: { content: true, model: true },
  });

  return NextResponse.json({
    explanation: saved.content,
    model: saved.model,
    cached: false,
  });
}
