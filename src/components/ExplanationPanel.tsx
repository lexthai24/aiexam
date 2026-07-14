"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { ExplanationResult } from "@/lib/types";

// Fetches (and caches on the server) the AI explanation for a question, then
// renders it. Shows a friendly loading state while Deepseek is thinking.
export function ExplanationPanel({ questionId }: { questionId: number }) {
  const [data, setData] = useState<ExplanationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    fetch(`/api/explanation/${questionId}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "เกิดข้อผิดพลาด");
        return json as ExplanationResult;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [questionId]);

  return (
    <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 animate-reveal">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
          <SparkIcon />
        </span>
        <h3 className="font-semibold text-[var(--foreground)]">คำอธิบายจาก AI</h3>
        {data?.cached && (
          <span
            title="ดึงจากคำอธิบายที่บันทึกไว้ ไม่เปลือง quota"
            className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
          >
            บันทึกไว้แล้ว
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-[var(--muted)]">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-transparent" />
          <span className="text-sm">AI กำลังเรียบเรียงคำอธิบายให้จำง่าย...</span>
        </div>
      )}

      {error && (
        <p className="text-sm text-[var(--wrong)]">
          ไม่สามารถโหลดคำอธิบายได้: {error}
        </p>
      )}

      {data && (
        <div className="explanation-md leading-relaxed text-[var(--foreground)]">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h4 className="mb-2 mt-1 text-base font-bold">{children}</h4>
              ),
              h2: ({ children }) => (
                <h5 className="mb-1.5 mt-4 flex items-center gap-1.5 font-semibold text-[var(--primary)]">
                  {children}
                </h5>
              ),
              h3: ({ children }) => (
                <h5 className="mb-1.5 mt-4 font-semibold text-[var(--primary)]">
                  {children}
                </h5>
              ),
              p: ({ children }) => <p className="mb-2">{children}</p>,
              ul: ({ children }) => (
                <ul className="mb-2 ml-1 flex list-none flex-col gap-1.5">
                  {children}
                </ul>
              ),
              li: ({ children }) => (
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--primary)]" />
                  <span>{children}</span>
                </li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
            }}
          >
            {data.explanation}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

function SparkIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1" />
    </svg>
  );
}
