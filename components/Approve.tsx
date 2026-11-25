"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Shell } from "@/components/Shell";
import { proposals } from "@/lib/mock";

type Decision = "pending" | "approved" | "rejected";

export default function ApprovePage() {
  const { id } = useParams<{ id: string }>();
  const [decisions, setDecisions] = useState<Record<string, Decision>>(
    Object.fromEntries(proposals.map((p) => [p.id, "pending"])),
  );
  const [busy, setBusy] = useState(false);
  const [filed, setFiled] = useState(false);

  const set = (key: string, d: Decision) =>
    setDecisions((p) => ({ ...p, [key]: d }));
  const values = Object.values(decisions);
  const allApproved = values.every((v) => v === "approved");
  const hasRejected = values.includes("rejected");

  const file = async () => {
    setBusy(true);
    // TODO: call your route that resumes the LangGraph run after the interrupt,
    // sending the approved decisions. This delay only simulates it.
    await new Promise((r) => setTimeout(r, 1200));
    setBusy(false);
    setFiled(true);
  };

  if (filed) {
    return (
      <Shell id={id} step={2}>
        <div className="flex flex-col items-center py-16 text-center">
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            fill="none"
            aria-hidden
          >
            <motion.circle
              cx="36"
              cy="36"
              r="32"
              stroke="#2E7D57"
              strokeWidth="4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5 }}
            />
            <motion.path
              d="M22 37l10 10 18-20"
              stroke="#2E7D57"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.4, duration: 0.35 }}
            />
          </svg>
          <h1 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-semibold">
            Return filed
          </h1>
          <p className="mt-2 max-w-prose text-[#5C6B72]">
            Keep the acknowledgement from the income tax portal for your
            records.
          </p>
          <Link
            href="/dashboard"
            className="mt-8 rounded-md bg-[#0E5A5A] px-5 py-2.5 font-medium text-white hover:bg-[#0b4a4a]"
          >
            Back to your returns
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell id={id} step={2}>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold">
        Approve each action
      </h1>
      <p className="mt-2 max-w-prose text-[#5C6B72]">
        The assistant will only do what you approve here. You can undo any
        decision before filing.
      </p>

      <ul className="mt-8 space-y-3">
        {proposals.map((p) => {
          const d = decisions[p.id];
          const bar =
            d === "approved"
              ? "border-l-[#2E7D57]"
              : d === "rejected"
                ? "border-l-[#B3402F]"
                : "border-l-[#B7791F]";
          return (
            <li
              key={p.id}
              className={`rounded-lg border border-l-4 border-[#D9E0DE] bg-white px-5 py-4 transition-colors ${bar}`}
            >
              <p className="font-medium">{p.title}</p>
              <p className="text-sm text-[#5C6B72]">{p.detail}</p>
              <div className="mt-3 h-9">
                <AnimatePresence mode="wait" initial={false}>
                  {d === "pending" ? (
                    <motion.div
                      key="choose"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex gap-2"
                    >
                      <button
                        onClick={() => set(p.id, "approved")}
                        className="rounded-md bg-[#0E5A5A] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#0b4a4a]"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => set(p.id, "rejected")}
                        className="rounded-md border border-[#B9C6C3] px-4 py-1.5 text-sm hover:bg-[#F1F4F3]"
                      >
                        Reject
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span
                        className={
                          d === "approved" ? "text-[#2E7D57]" : "text-[#B3402F]"
                        }
                      >
                        {d === "approved" ? "Approved" : "Rejected"}
                      </span>
                      <button
                        onClick={() => set(p.id, "pending")}
                        className="text-[#5C6B72] underline hover:text-[#12232B]"
                      >
                        Undo
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-10">
        <button
          disabled={!allApproved || busy}
          onClick={file}
          className="rounded-md bg-[#0E5A5A] px-5 py-2.5 font-medium text-white hover:bg-[#0b4a4a] disabled:cursor-not-allowed disabled:bg-[#B9C6C3]"
        >
          {busy ? "Filing…" : "File my return"}
        </button>
        {hasRejected && (
          <p className="mt-3 text-sm text-[#5C6B72]">
            You rejected an action, so filing is paused.{" "}
            <Link href={`/filing/${id}/review`} className="underline">
              Go back and change your figures
            </Link>
            .
          </p>
        )}
      </div>
    </Shell>
  );
}
