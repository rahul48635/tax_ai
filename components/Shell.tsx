"use client";

import Link from "next/link";
import { MotionConfig } from "framer-motion";

const steps = ["Upload", "Review", "Approve"];

export function Shell({
  children,
  id,
  step,
}: {
  children: React.ReactNode;
  id?: string;
  step?: 0 | 1 | 2;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen">
        <header className="border-b border-[#D9E0DE] bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
            <Link
              href="/dashboard"
              className="font-[family-name:var(--font-display)] text-xl font-semibold text-[#0E5A5A]"
            >
              ITR Assistant
            </Link>
            {id && (
              <span className="text-sm text-[#5C6B72]">
                {id.replace("ay-", "AY ")}
              </span>
            )}
          </div>
          {id && step !== undefined && (
            <ol className="mx-auto flex max-w-3xl gap-6 px-5 text-sm">
              {steps.map((s, i) => (
                <li
                  key={s}
                  aria-current={i === step ? "step" : undefined}
                  className={
                    i === step
                      ? "border-b-2 border-[#0E5A5A] pb-2 font-medium text-[#0E5A5A]"
                      : "border-b-2 border-transparent pb-2 text-[#5C6B72]"
                  }
                >
                  {i + 1}. {s}
                </li>
              ))}
            </ol>
          )}
        </header>
        <main className="mx-auto max-w-3xl px-5 py-10">{children}</main>
      </div>
    </MotionConfig>
  );
}
