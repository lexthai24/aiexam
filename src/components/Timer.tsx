"use client";

import { useEffect, useRef, useState } from "react";

// Countdown timer for exam mode. Calls onExpire once when it hits zero.
// Turns amber under 5 minutes and red under 1 minute.
export function Timer({
  totalSeconds,
  onExpire,
}: {
  totalSeconds: number;
  onExpire: () => void;
}) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      // Compute from wall-clock so a backgrounded tab stays accurate.
      const elapsed = Math.floor((Date.now() - started) / 1000);
      const left = Math.max(0, totalSeconds - elapsed);
      setRemaining(left);
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(id);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [totalSeconds, onExpire]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const label = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  let tone = "bg-[var(--surface)] text-[var(--foreground)] border-[var(--border)]";
  if (remaining <= 60)
    tone = "bg-[var(--wrong-bg)] text-[var(--wrong)] border-[var(--wrong)]";
  else if (remaining <= 300)
    tone =
      "bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/40";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold tabular-nums ${tone}`}
      aria-label="เวลาที่เหลือ"
    >
      <ClockIcon />
      {label}
    </span>
  );
}

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
