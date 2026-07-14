"use client";

import { useState } from "react";
import type { User } from "@/lib/types";
import { fetchJson } from "@/lib/fetchJson";

// Lightweight identity: display name + 4-digit PIN. Not real auth — it just
// keeps each person's progress separate and portable across devices.
export function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = name.trim().length >= 1 && /^\d{4}$/.test(pin);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      const user = await fetchJson<User & { created: boolean }>("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), pin }),
      });
      onLogin({ userId: user.userId, name: user.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold sm:text-2xl">เริ่มติวสอบ</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          ใส่ชื่อและ PIN 4 หลักเพื่อบันทึกความคืบหน้าของคุณ
          <br />
          ใช้ชื่อและ PIN เดิมเพื่อเข้าต่อจากเครื่องไหนก็ได้
        </p>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">ชื่อของคุณ</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น สมชาย"
              maxLength={40}
              autoComplete="off"
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-base outline-none transition-colors focus:border-[var(--primary)]"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">PIN 4 หลัก</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d*"
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="••••"
              className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-base tracking-[0.5em] outline-none transition-colors focus:border-[var(--primary)]"
            />
            <span className="text-xs text-[var(--muted)]">
              เลือกตัวเลข 4 หลักที่จำได้ (ไม่ใช่รหัสผ่านสำคัญ)
            </span>
          </label>

          {error && <p className="text-sm text-[var(--wrong)]">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? (
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
            ) : (
              "เข้าสู่ระบบ"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
