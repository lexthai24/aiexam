"use client";

import { useCallback, useEffect, useState } from "react";
import type { QuizConfig, SavedSession, User } from "@/lib/types";
import { fetchJson } from "@/lib/fetchJson";
import { Login } from "@/components/Login";
import { ModeSelect } from "@/components/ModeSelect";
import { Quiz } from "@/components/Quiz";

const USER_KEY = "aiexam_user";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [resume, setResume] = useState<SavedSession | null>(null);
  const [ready, setReady] = useState(false);

  // Restore a saved login so returning users skip the name+PIN screen.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
    setReady(true);
  }, []);

  // When a user is known and we're on the mode-select screen, look for an
  // in-progress session to offer resuming.
  const refreshSession = useCallback((u: User) => {
    fetchJson<{ session: SavedSession | null }>(
      `/api/session?userId=${u.userId}`
    )
      .then((r) => setResume(r.session))
      .catch(() => setResume(null));
  }, []);

  useEffect(() => {
    if (user && !config) refreshSession(user);
  }, [user, config, refreshSession]);

  function handleLogin(u: User) {
    setUser(u);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      // ignore
    }
  }

  function handleLogout() {
    setUser(null);
    setConfig(null);
    setResume(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
  }

  // Resume the saved session: derive its config and enter the quiz.
  function handleResume() {
    if (!resume) return;
    setConfig({
      mode: resume.mode,
      timeLimitMin: resume.timeLimitMin ?? undefined,
    });
  }

  const inQuiz = Boolean(config);
  // Pass the resume session to Quiz only when the chosen config matches it.
  const resumeForQuiz =
    resume && config && resume.mode === config.mode ? resume : null;

  return (
    <main className="flex flex-1 flex-col">
      <Header />
      {!ready ? null : !user ? (
        <Login onLogin={handleLogin} />
      ) : !inQuiz ? (
        <ModeSelect
          user={user}
          resume={resume}
          onResume={handleResume}
          onStart={(c) => {
            setResume(null); // starting fresh discards any paused session
            setConfig(c);
          }}
          onLogout={handleLogout}
        />
      ) : (
        <Quiz
          user={user}
          config={config!}
          resume={resumeForQuiz}
          onExit={() => {
            setConfig(null);
            refreshSession(user);
          }}
        />
      )}
    </main>
  );
}

function Header() {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
          <BookIcon />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-bold leading-tight">ติวสอบ อสพ.</h1>
          <p className="truncate text-xs text-[var(--muted)]">
            อาสาพัฒนา · กรมการพัฒนาชุมชน · ฝึกทำข้อสอบพร้อมคำอธิบายจาก AI
          </p>
        </div>
      </div>
    </header>
  );
}

function BookIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
