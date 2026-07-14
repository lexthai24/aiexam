import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Resumable quiz sessions. There is at most one active (unfinished) session per
// user; saving replaces it. This lets a user pause and continue later — even
// from another device — since the state lives in the DB keyed by userId.

// GET /api/session?userId=<n>
// Returns the user's active (unfinished) session, or { session: null }.
export async function GET(req: NextRequest) {
  try {
    const userId = Number(new URL(req.url).searchParams.get("userId"));
    if (!Number.isInteger(userId)) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    const session = await prisma.quizSession.findFirst({
      where: { userId, finished: false },
      orderBy: { updatedAt: "desc" },
    });
    return NextResponse.json({ session: session ?? null });
  } catch (err) {
    console.error("GET /api/session failed:", err);
    return NextResponse.json({ error: "โหลดสถานะการสอบไม่สำเร็จ" }, { status: 500 });
  }
}

interface SavePayload {
  userId?: number;
  mode?: string;
  timeLimitMin?: number | null;
  seed?: string;
  questionIds?: number[];
  answers?: Record<string, number>; // questionId -> chosenChoiceId
  current?: number;
  remainingSec?: number | null;
  finished?: boolean;
}

// POST /api/session
// Upserts the user's single active session (pause/save). Set finished:true to
// close it out (so it no longer offers to resume).
export async function POST(req: NextRequest) {
  let body: SavePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    userId,
    mode,
    seed,
    questionIds,
    answers = {},
    current = 0,
    timeLimitMin = null,
    remainingSec = null,
    finished = false,
  } = body;

  if (
    typeof userId !== "number" ||
    typeof mode !== "string" ||
    typeof seed !== "string" ||
    !Array.isArray(questionIds)
  ) {
    return NextResponse.json(
      { error: "userId, mode, seed and questionIds are required" },
      { status: 400 }
    );
  }

  try {
    // Keep a single active session per user: remove any existing active one,
    // then create the new snapshot (or, if finishing, just clear active ones).
    await prisma.quizSession.deleteMany({ where: { userId, finished: false } });

    if (finished) {
      return NextResponse.json({ ok: true, session: null });
    }

    const session = await prisma.quizSession.create({
      data: {
        userId,
        mode,
        timeLimitMin: timeLimitMin ?? null,
        seed,
        questionIds,
        answers,
        current,
        remainingSec: remainingSec ?? null,
        finished: false,
      },
    });
    return NextResponse.json({ ok: true, session });
  } catch (err) {
    console.error("POST /api/session failed:", err);
    return NextResponse.json({ error: "บันทึกสถานะการสอบไม่สำเร็จ" }, { status: 500 });
  }
}
