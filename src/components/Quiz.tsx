"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AnswerResult, QuestionDTO, QuizConfig, User } from "@/lib/types";
import { fetchJson } from "@/lib/fetchJson";
import { ExplanationPanel } from "./ExplanationPanel";
import { Timer } from "./Timer";

// Per-question state kept in memory for the whole round.
interface QState {
  chosenChoiceId?: number;
  result?: AnswerResult;
}

export function Quiz({
  user,
  config,
  onExit,
}: {
  user: User;
  config: QuizConfig;
  onExit: () => void;
}) {
  const isExam = config.mode === "exam";
  const timed = isExam && !!config.timeLimitMin;

  const [questions, setQuestions] = useState<QuestionDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [states, setStates] = useState<Record<number, QState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [round, setRound] = useState(0);

  // Load a randomized round from the mode-appropriate endpoint.
  useEffect(() => {
    setQuestions(null);
    setLoadError(null);
    setCurrent(0);
    setStates({});
    setFinished(false);

    const seed = `${user.userId}:${config.mode}:${round}`;
    const endpoint =
      config.mode === "review"
        ? `/api/mistakes?userId=${user.userId}&seed=${encodeURIComponent(seed)}`
        : `/api/questions?seed=${encodeURIComponent(seed)}`;

    fetchJson<{ questions: QuestionDTO[] }>(endpoint)
      .then((json) => setQuestions(json.questions))
      .catch((err) => setLoadError(err.message));
  }, [user.userId, config.mode, round]);

  const answeredCount = useMemo(
    () =>
      Object.values(states).filter((s) => s.chosenChoiceId !== undefined).length,
    [states]
  );
  const correctCount = useMemo(
    () => Object.values(states).filter((s) => s.result?.isCorrect).length,
    [states]
  );

  const finish = useCallback(() => setFinished(true), []);

  if (loadError) {
    return (
      <Screen onExit={onExit} title={titleFor(config)}>
        <Centered>
          <p className="text-[var(--wrong)]">{loadError}</p>
        </Centered>
      </Screen>
    );
  }

  if (!questions) {
    return (
      <Screen onExit={onExit} title={titleFor(config)}>
        <Centered>
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          <p className="mt-3 text-[var(--muted)]">กำลังโหลดข้อสอบ...</p>
        </Centered>
      </Screen>
    );
  }

  if (questions.length === 0) {
    return (
      <Screen onExit={onExit} title={titleFor(config)}>
        <Centered>
          {config.mode === "review" ? (
            <>
              <p className="text-2xl">🎉</p>
              <p className="mt-2 font-semibold">ยังไม่มีข้อที่ตอบผิด</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                ไปฝึกในโหมดอื่นก่อน แล้วข้อที่ตอบผิดจะมาอยู่ที่นี่
              </p>
              <button
                onClick={onExit}
                className="mt-5 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white"
              >
                กลับไปเลือกโหมด
              </button>
            </>
          ) : (
            <p className="text-[var(--muted)]">
              ยังไม่มีข้อสอบในระบบ กรุณารัน <code>npm run seed</code>
            </p>
          )}
        </Centered>
      </Screen>
    );
  }

  if (finished) {
    return (
      <Screen onExit={onExit} title="ผลสรุป">
        <ResultsView
          questions={questions}
          states={states}
          correctCount={correctCount}
          showExplanations={isExam}
          onRestart={() => setRound((r) => r + 1)}
          onExit={onExit}
        />
      </Screen>
    );
  }

  const q = questions[current];
  const state = states[q.id] ?? {};
  const chosen = state.chosenChoiceId !== undefined;
  // In exam mode we defer the reveal until the whole exam is submitted.
  const revealed = chosen && !isExam;

  async function choose(choiceId: number) {
    if (chosen || submitting) return;
    if (isExam) {
      // Record the choice locally; grade later on submit.
      setStates((prev) => ({ ...prev, [q.id]: { chosenChoiceId: choiceId } }));
      return;
    }
    setSubmitting(true);
    try {
      const result = await fetchJson<AnswerResult>("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, choiceId, userId: user.userId }),
      });
      setStates((prev) => ({ ...prev, [q.id]: { chosenChoiceId: choiceId, result } }));
    } catch {
      // allow retry
    } finally {
      setSubmitting(false);
    }
  }

  // Submit an exam: grade every answered question, then show results.
  async function submitExam() {
    setSubmitting(true);
    try {
      const entries = Object.entries(states).filter(
        ([, s]) => s.chosenChoiceId !== undefined
      );
      const graded = await Promise.all(
        entries.map(async ([qid, s]) => {
          const result = await fetchJson<AnswerResult>("/api/answer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              questionId: Number(qid),
              choiceId: s.chosenChoiceId,
              userId: user.userId,
            }),
          });
          return [qid, { ...s, result }] as const;
        })
      );
      setStates((prev) => {
        const next = { ...prev };
        for (const [qid, s] of graded) next[Number(qid)] = s;
        return next;
      });
      setFinished(true);
    } catch {
      // allow retry
    } finally {
      setSubmitting(false);
    }
  }

  const isLast = current === questions.length - 1;
  const canFinish = isExam ? answeredCount > 0 : chosen;

  return (
    <Screen
      onExit={onExit}
      title={titleFor(config)}
      right={
        timed ? (
          <Timer
            totalSeconds={config.timeLimitMin! * 60}
            onExpire={submitExam}
          />
        ) : undefined
      }
    >
      <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:py-8">
        {/* Progress header */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted)]">
            <span>
              ข้อ {current + 1} จาก {questions.length}
            </span>
            {isExam ? (
              <span>ตอบแล้ว {answeredCount}</span>
            ) : (
              <span>
                ตอบแล้ว {answeredCount} · ถูก{" "}
                <span className="font-semibold text-[var(--correct)]">
                  {correctCount}
                </span>
              </span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-7">
          <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            {q.category}
          </span>
          <h2 className="mt-3 text-base font-semibold leading-relaxed sm:text-xl">
            {q.text}
          </h2>

          <div className="mt-5 flex flex-col gap-2.5">
            {q.choices.map((choice) => {
              const isChosen = state.chosenChoiceId === choice.id;
              const isCorrectChoice =
                revealed && state.result?.correctChoiceId === choice.id;
              const isWrongChosen =
                revealed && isChosen && !state.result?.isCorrect;

              let cls =
                "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10";
              if (isCorrectChoice)
                cls =
                  "border-[var(--correct)] bg-[var(--correct-bg)] text-[var(--correct)]";
              else if (isWrongChosen)
                cls =
                  "border-[var(--wrong)] bg-[var(--wrong-bg)] text-[var(--wrong)]";
              else if (isExam && isChosen)
                cls =
                  "border-[var(--primary)] bg-indigo-50/60 dark:bg-indigo-500/15";
              else if (revealed) cls = "border-[var(--border)] opacity-60";

              return (
                <button
                  key={choice.id}
                  onClick={() => choose(choice.id)}
                  disabled={revealed || submitting}
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors sm:p-4 ${cls} ${
                    revealed ? "cursor-default" : "cursor-pointer"
                  }`}
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-current text-sm font-semibold">
                    {choice.label}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{choice.text}</span>
                  {isCorrectChoice && (
                    <span className="ml-auto pt-1">
                      <CheckIcon />
                    </span>
                  )}
                  {isWrongChosen && (
                    <span className="ml-auto pt-1">
                      <XIcon />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Immediate feedback (practice/review only) */}
          {revealed && (
            <div
              className={`mt-5 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium animate-reveal ${
                state.result?.isCorrect
                  ? "bg-[var(--correct-bg)] text-[var(--correct)]"
                  : "bg-[var(--wrong-bg)] text-[var(--wrong)]"
              }`}
            >
              {state.result?.isCorrect ? (
                <>
                  <CheckIcon /> ถูกต้อง! เก่งมาก 🎉
                </>
              ) : (
                <>
                  <XIcon /> ยังไม่ถูก — คำตอบที่ถูกคือข้อ{" "}
                  {q.choices.find((c) => c.id === state.result?.correctChoiceId)
                    ?.label}
                </>
              )}
            </div>
          )}

          {revealed && <ExplanationPanel questionId={q.id} />}
        </div>

        {/* Navigation */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-40"
          >
            ← ก่อนหน้า
          </button>

          {isLast ? (
            <button
              onClick={isExam ? submitExam : finish}
              disabled={!canFinish || submitting}
              className="rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isExam ? "ส่งคำตอบ" : "ดูผลสรุป"}
            </button>
          ) : (
            <button
              onClick={() =>
                setCurrent((c) => Math.min(questions.length - 1, c + 1))
              }
              disabled={!isExam && !chosen}
              className="rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              ถัดไป →
            </button>
          )}
        </div>

        {isExam && (
          <div className="mt-4 text-center">
            <button
              onClick={submitExam}
              disabled={!canFinish || submitting}
              className="text-sm font-medium text-[var(--primary)] underline-offset-2 hover:underline disabled:opacity-40"
            >
              ส่งคำตอบและดูผลตอนนี้ ({answeredCount}/{questions.length})
            </button>
          </div>
        )}
      </div>
    </Screen>
  );
}

function titleFor(config: QuizConfig): string {
  if (config.mode === "practice") return "โหมดฝึกฝน";
  if (config.mode === "review") return "ทบทวนข้อที่ผิด";
  return config.timeLimitMin
    ? `จับเวลา ${config.timeLimitMin} นาที`
    : "โหมดสอบ";
}

// Shared chrome: top bar with a back button, title, and optional right slot.
function Screen({
  title,
  right,
  onExit,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  onExit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <button
            onClick={onExit}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--border)] hover:text-[var(--foreground)]"
            aria-label="กลับไปเลือกโหมด"
          >
            ←
          </button>
          <span className="flex-1 truncate font-semibold">{title}</span>
          {right}
        </div>
      </div>
      {children}
    </div>
  );
}

function ResultsView({
  questions,
  states,
  correctCount,
  showExplanations,
  onRestart,
  onExit,
}: {
  questions: QuestionDTO[];
  states: Record<number, QState>;
  correctCount: number;
  showExplanations: boolean;
  onRestart: () => void;
  onExit: () => void;
}) {
  const total = questions.length;
  const pct = total ? Math.round((correctCount / total) * 100) : 0;
  const answeredCount = Object.values(states).filter((s) => s.result).length;
  const [reviewIdx, setReviewIdx] = useState<number | null>(null);

  let verdict = "พยายามต่อไปนะ! ทบทวนข้อที่ผิดแล้วลองใหม่";
  if (pct >= 80) verdict = "ยอดเยี่ยม! พร้อมสอบมาก 🏆";
  else if (pct >= 60) verdict = "ดีมาก! อีกนิดเดียวก็เพอร์เฟกต์";
  else if (pct >= 40) verdict = "มาถูกทางแล้ว ทบทวนเพิ่มอีกหน่อย";

  // Detailed review of one question (used after an exam to see the explanation).
  if (reviewIdx !== null) {
    const q = questions[reviewIdx];
    const s = states[q.id] ?? {};
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <button
          onClick={() => setReviewIdx(null)}
          className="mb-4 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← กลับไปผลสรุป
        </button>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-7">
          <span className="text-xs text-[var(--muted)]">
            ข้อ {reviewIdx + 1} · {q.category}
          </span>
          <h2 className="mt-2 text-base font-semibold leading-relaxed sm:text-lg">
            {q.text}
          </h2>
          <div className="mt-4 flex flex-col gap-2">
            {q.choices.map((c) => {
              const isCorrect = s.result?.correctChoiceId === c.id;
              const isChosenWrong =
                s.chosenChoiceId === c.id && !s.result?.isCorrect;
              let cls = "border-[var(--border)] opacity-70";
              if (isCorrect)
                cls =
                  "border-[var(--correct)] bg-[var(--correct-bg)] text-[var(--correct)]";
              else if (isChosenWrong)
                cls =
                  "border-[var(--wrong)] bg-[var(--wrong-bg)] text-[var(--wrong)]";
              return (
                <div
                  key={c.id}
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 ${cls}`}
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-current text-sm font-semibold">
                    {c.label}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{c.text}</span>
                </div>
              );
            })}
          </div>
          <ExplanationPanel questionId={q.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-sm sm:p-8">
        <p className="text-sm font-medium text-[var(--muted)]">ผลสรุป</p>
        <div className="mt-3 text-5xl font-bold text-[var(--primary)]">
          {correctCount}
          <span className="text-2xl text-[var(--muted)]">/{total}</span>
        </div>
        <p className="mt-1 text-lg font-semibold">{pct}%</p>
        <p className="mt-3 text-[var(--muted)]">{verdict}</p>
        {answeredCount < total && (
          <p className="mt-2 text-xs text-[var(--muted)]">
            (ตอบไปแล้ว {answeredCount} ข้อ)
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={onRestart}
            className="rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            เริ่มรอบใหม่
          </button>
          <button
            onClick={onExit}
            className="rounded-xl border border-[var(--border)] px-6 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--primary)]"
          >
            เลือกโหมดอื่น
          </button>
        </div>
      </div>

      {/* Question grid — tap to review with the explanation */}
      <h3 className="mb-3 mt-8 font-semibold">
        {showExplanations ? "ดูเฉลยรายข้อ (แตะเพื่อดูคำอธิบาย)" : "ทบทวนรายข้อ"}
      </h3>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
        {questions.map((q, idx) => {
          const s = states[q.id];
          const base =
            "flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-transform active:scale-95 sm:hover:scale-105";
          let cls = "bg-[var(--border)] text-[var(--muted)]";
          if (s?.result?.isCorrect) cls = "bg-[var(--correct)] text-white";
          else if (s?.result) cls = "bg-[var(--wrong)] text-white";
          return (
            <button
              key={q.id}
              onClick={() => setReviewIdx(idx)}
              className={`${base} ${cls}`}
              title={`ข้อ ${idx + 1}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      {children}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
