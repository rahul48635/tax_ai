"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shell } from "@/components/Shell";
import { filings, inr, type Filing } from "@/lib/mock";

const statusText: Record<Filing["status"], string> = {
  draft: "Draft",
  "needs-review": "Needs your review",
  "awaiting-approval": "Waiting for your approval",
  filed: "Filed",
};

const href = (f: Filing) =>
  f.status === "draft"
    ? `/filing/${f.id}/upload`
    : f.status === "needs-review"
      ? `/filing/${f.id}/review`
      : `/filing/${f.id}/approve`;

export default function DashboardPage() {
  return (
    <Shell>
      <div className="mb-8 flex items-end justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold">
          Your returns
        </h1>
        <Link
          href="/filing/new/upload"
          className="rounded-md bg-[#0E5A5A] px-4 py-2 text-sm font-medium text-white hover:bg-[#0b4a4a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A5A]"
        >
          Start a new return
        </Link>
      </div>

      <ul className="divide-y divide-[#D9E0DE] rounded-lg border border-[#D9E0DE] bg-white">
        {filings.map((f, i) => {
          const needsYou = f.status !== "filed";
          return (
            <motion.li
              key={f.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.25 }}
            >
              <Link
                href={href(f)}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#F1F4F3]"
              >
                <div>
                  <p className="font-medium">{f.year}</p>
                  {f.refund && (
                    <p className="text-sm text-[#5C6B72]">
                      Refund of {inr(f.refund)}
                    </p>
                  )}
                </div>
                <span
                  className={
                    needsYou
                      ? "rounded-full bg-[#FBF1DC] px-3 py-1 text-sm text-[#8A5A0B]"
                      : "rounded-full bg-[#E3F1EA] px-3 py-1 text-sm text-[#2E7D57]"
                  }
                >
                  {statusText[f.status]}
                </span>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </Shell>
  );
}
