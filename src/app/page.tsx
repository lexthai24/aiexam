import { Quiz } from "@/components/Quiz";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
            <BookIcon />
          </div>
          <div>
            <h1 className="font-bold leading-tight">ติวสอบ อสพ.</h1>
            <p className="text-xs text-[var(--muted)]">
              อาสาพัฒนา · กรมการพัฒนาชุมชน · ฝึกทำข้อสอบพร้อมคำอธิบายจาก AI
            </p>
          </div>
        </div>
      </header>

      <Quiz />
    </main>
  );
}

function BookIcon() {
  return (
    <svg
      width="20"
      height="20"
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
