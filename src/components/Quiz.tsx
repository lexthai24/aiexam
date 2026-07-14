"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnswerResult, QuestionDTO } from "@/lib/types";
import { fetchJson } from "@/lib/fetchJson";
import { ExplanationPanel } from "./ExplanationPanel";

// Per-question state kept in memory for the whole session so learners can
// navigate back and forth and see a final summary.
interface QState {
  chosenLabel?: string;
  result?: AnswerResult;
}

function getSessionId(): string {
  const KEY = "aiexam_session_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function Quiz() {
  const [questions, setQuestions] = useState<QuestionDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [states, setStates] = useState<Record<number, QState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sessionId, setSessionId] = useState("");
  // `round` seeds the randomization. It stays fixed while doing a quiz (so
  // reloading keeps the same questions/order) and increments on restart to draw
  // a fresh, differently-ordered set of 100 questions.
  const [round, setRound] = useState(0);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  // (Re)load a randomized round of questions whenever the round changes.
  useEffect(() => {
    if (!sessionId) return;
    setQuestions(null);
    setLoadError(null);
    const seed = `${sessionId}:${round}`;
    fetchJson<{ questions: QuestionDTO[] }>(
      `/api/questions?seed=${encodeURIComponent(seed)}`
    )
      .then((json) => setQuestions(json.questions))
      .catch((err) => setLoadError(err.message));
  }, [sessionId, round]);

  const answeredCount = useMemo(
    () => Object.values(states).filter((s) => s.result).length,
    [states]
  );
  const correctCount = useMemo(
    () => Object.values(states).filter((s) => s.result?.isCorrect).length,
    [states]
  );

  if (loadError) {
    return (
      <Centered>
        <p className="text-[var(--wrong)]">{loadError}</p>
      </Centered>
    );
  }

  if (!questions) {
    return (
      <Centered>
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
        <p className="mt-3 text-[var(--muted)]">กำลังโหลดข้อสอบ...</p>
      </Centered>
    );
  }

  if (questions.length === 0) {
    return (
      <Centered>
        <p className="text-[var(--muted)]">
          ยังไม่มีข้อสอบในระบบ กรุณารัน <code>npm run seed</code>
        </p>
      </Centered>
    );
  }

  if (finished) {
    return (
      <ResultsView
        questions={questions}
        states={states}
        correctCount={correctCount}
        onReview={(idx) => {
          setCurrent(idx);
          setFinished(false);
        }}
        onRestart={() => {
          setStates({});
          setCurrent(0);
          setFinished(false);
          // New round → new seed → a fresh, differently-ordered set of 100.
          setRound((r) => r + 1);
        }}
      />
    );
  }

  const q = questions[current];
  const state = states[q.id] ?? {};
  const answered = Boolean(state.result);

  async function choose(label: string) {
    if (answered || submitting) return;
    setSubmitting(true);
    try {
      const result = await fetchJson<AnswerResult>("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          chosenLabel: label,
          sessionId,
        }),
      });
      setStates((prev) => ({
        ...prev,
        [q.id]: { chosenLabel: label, result },
      }));
    } catch {
      // keep it simple: allow retry on failure
    } finally {
      setSubmitting(false);
    }
  }

  const isLast = current === questions.length - 1;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">
      {/* Progress header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted)]">
          <span>
            ข้อ {current + 1} จาก {questions.length}
          </span>
          <span>
            ตอบแล้ว {answeredCount} · ถูก{" "}
            <span className="font-semibold text-[var(--correct)]">
              {correctCount}
            </span>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <span className="inline-block rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
          {q.category}
        </span>
        <h2 className="mt-4 text-lg font-semibold leading-relaxed sm:text-xl">
          {q.text}
        </h2>

        <div className="mt-5 flex flex-col gap-3">
          {q.choices.map((choice) => {
            const isChosen = state.chosenLabel === choice.label;
            const isCorrectChoice =
              answered && state.result?.correctLabel === choice.label;
            const isWrongChosen =
              answered && isChosen && !state.result?.isCorrect;

            let cls =
              "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10";
            if (isCorrectChoice)
              cls =
                "border-[var(--correct)] bg-[var(--correct-bg)] text-[var(--correct)]";
            else if (isWrongChosen)
              cls =
                "border-[var(--wrong)] bg-[var(--wrong-bg)] text-[var(--wrong)]";
            else if (answered) cls = "border-[var(--border)] opacity-60";

            return (
              <button
                key={choice.id}
                onClick={() => choose(choice.label)}
                disabled={answered || submitting}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${cls} ${
                  answered ? "cursor-default" : "cursor-pointer"
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

        {/* Feedback banner */}
        {answered && (
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
                {state.result?.correctLabel}
              </>
            )}
          </div>
        )}

        {/* AI explanation appears only after answering */}
        {answered && <ExplanationPanel questionId={q.id} />}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-40"
        >
          ← ก่อนหน้า
        </button>

        {isLast ? (
          <button
            onClick={() => setFinished(true)}
            disabled={!answered}
            className="rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            ดูผลสรุป
          </button>
        ) : (
          <button
            onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
            disabled={!answered}
            className="rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            ถัดไป →
          </button>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-[var(--muted)]">
        ตอบเพื่อดูเฉลยและคำอธิบายจาก AI · ความคืบหน้าจะถูกบันทึกในเครื่องนี้
      </p>
    </div>
  );
}

function ResultsView({
  questions,
  states,
  correctCount,
  onReview,
  onRestart,
}: {
  questions: QuestionDTO[];
  states: Record<number, QState>;
  correctCount: number;
  onReview: (idx: number) => void;
  onRestart: () => void;
}) {
  const total = questions.length;
  const pct = Math.round((correctCount / total) * 100);
  const answeredCount = Object.values(states).filter((s) => s.result).length;

  let verdict = "พยายามต่อไปนะ! ทบทวนข้อที่ผิดแล้วลองใหม่";
  if (pct >= 80) verdict = "ยอดเยี่ยม! พร้อมสอบมาก 🏆";
  else if (pct >= 60) verdict = "ดีมาก! อีกนิดเดียวก็เพอร์เฟกต์";
  else if (pct >= 40) verdict = "มาถูกทางแล้ว ทบทวนเพิ่มอีกหน่อย";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
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

        <button
          onClick={onRestart}
          className="mt-6 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          เริ่มทำใหม่
        </button>
      </div>

      {/* Question grid for quick review */}
      <h3 className="mb-3 mt-8 font-semibold">ทบทวนรายข้อ</h3>
      <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
        {questions.map((q, idx) => {
          const s = states[q.id];
          const base =
            "flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-transform hover:scale-105";
          let cls =
            "bg-[var(--border)] text-[var(--muted)]"; // unanswered
          if (s?.result?.isCorrect) cls = "bg-[var(--correct)] text-white";
          else if (s?.result) cls = "bg-[var(--wrong)] text-white";
          return (
            <button
              key={q.id}
              onClick={() => onReview(idx)}
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
