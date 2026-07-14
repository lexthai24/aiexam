"use client";

import { useState } from "react";
import type { QuizConfig, QuizMode, SavedSession, User } from "@/lib/types";

// Time options for exam mode (minutes). null = untimed.
const TIME_OPTIONS: { label: string; value: number | null }[] = [
  { label: "30 นาที", value: 30 },
  { label: "60 นาที", value: 60 },
  { label: "90 นาที", value: 90 },
  { label: "120 นาที", value: 120 },
  { label: "ไม่จับเวลา", value: null },
];

interface ModeCard {
  mode: QuizMode;
  emoji: string;
  title: string;
  desc: string;
}

const MODES: ModeCard[] = [
  {
    mode: "practice",
    emoji: "📚",
    title: "ฝึกฝน",
    desc: "ตอบทีละข้อ เห็นเฉลยและคำอธิบายจาก AI ทันที ไม่จับเวลา เหมาะกับการทบทวน",
  },
  {
    mode: "exam",
    emoji: "⏱️",
    title: "จับเวลาเสมือนสอบจริง",
    desc: "ทำรวดเดียวไม่เฉลยระหว่างทาง จับเวลา แล้วดูสรุปคะแนนพร้อมเฉลยตอนจบ",
  },
  {
    mode: "review",
    emoji: "🔁",
    title: "ทบทวนข้อที่ผิด",
    desc: "หยิบเฉพาะข้อที่คุณเคยตอบผิดมาทำซ้ำ เก็บจุดอ่อนให้แม่น",
  },
];

export function ModeSelect({
  user,
  resume,
  onResume,
  onStart,
  onLogout,
}: {
  user: User;
  resume?: SavedSession | null;
  onResume: () => void;
  onStart: (config: QuizConfig) => void;
  onLogout: () => void;
}) {
  const [pickingTimeFor, setPickingTimeFor] = useState<QuizMode | null>(null);

  function choose(mode: QuizMode) {
    if (mode === "exam") {
      setPickingTimeFor("exam");
      return;
    }
    onStart({ mode });
  }

  const resumeMode = resume ? MODES.find((m) => m.mode === resume.mode) : null;
  const resumeAnswered = resume ? Object.keys(resume.answers).length : 0;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">สวัสดี</p>
          <p className="text-lg font-bold">{user.name}</p>
        </div>
        <button
          onClick={onLogout}
          className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          ออกจากระบบ
        </button>
      </div>

      {/* Resume banner for an in-progress session */}
      {resume && resumeMode && (
        <div className="mb-5 rounded-2xl border border-[var(--primary)] bg-indigo-50/60 p-4 dark:bg-indigo-500/10 animate-reveal">
          <p className="font-semibold text-[var(--primary)]">
            {resumeMode.emoji} มีการสอบค้างอยู่ — {resumeMode.title}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            ทำไปแล้ว {resumeAnswered} ข้อ
            {resume.timeLimitMin ? ` · จับเวลา ${resume.timeLimitMin} นาที` : ""}
          </p>
          <button
            onClick={onResume}
            className="mt-3 w-full rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            ▶ ทำต่อจากที่ค้างไว้
          </button>
        </div>
      )}

      <h2 className="mb-1 text-xl font-bold sm:text-2xl">เลือกโหมดการฝึก</h2>
      <p className="mb-5 text-sm text-[var(--muted)]">
        แต่ละรอบจะสุ่มข้อสอบ 100 ข้อ ลำดับไม่เหมือนกัน
        {resume ? " (การเริ่มใหม่จะยกเลิกการสอบที่ค้างไว้)" : ""}
      </p>

      <div className="flex flex-col gap-3">
        {MODES.map((m) => (
          <button
            key={m.mode}
            onClick={() => choose(m.mode)}
            className="group flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-sm transition-colors hover:border-[var(--primary)] sm:p-5"
          >
            <span className="text-3xl sm:text-4xl">{m.emoji}</span>
            <span className="flex-1">
              <span className="block font-semibold group-hover:text-[var(--primary)]">
                {m.title}
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-[var(--muted)]">
                {m.desc}
              </span>
            </span>
            <span className="self-center text-[var(--muted)] group-hover:text-[var(--primary)]">
              →
            </span>
          </button>
        ))}
      </div>

      {/* Time picker sheet for exam mode */}
      {pickingTimeFor === "exam" && (
        <div
          className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => setPickingTimeFor(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-[var(--surface)] p-6 shadow-xl animate-reveal sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold">ตั้งเวลาสอบ</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              เลือกเวลาที่ต้องการสำหรับ 100 ข้อนี้
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={t.label}
                  onClick={() =>
                    onStart({ mode: "exam", timeLimitMin: t.value ?? undefined })
                  }
                  className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium transition-colors hover:border-[var(--primary)] hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPickingTimeFor(null)}
              className="mt-4 w-full rounded-xl px-4 py-2.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
