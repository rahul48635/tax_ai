"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { extracted, inr, type Item } from "@/lib/mock";

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(extracted); // TODO: load from your API

  const update = (itemId: string, patch: Partial<Item>) =>
    setItems((p) => p.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));

  const sum = (k: Item["kind"]) =>
    items.filter((i) => i.kind === k).reduce((s, i) => s + i.amount, 0);
  const pending = items.filter((i) => i.check).length;

  const group = (kind: Item["kind"], title: string) => (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
          {title}
        </h2>
        <p className="tabular-nums text-[#5C6B72]">{inr(sum(kind))}</p>
      </div>
      <ul className="mt-3 divide-y divide-[#D9E0DE] rounded-lg border border-[#D9E0DE] bg-white">
        {items
          .filter((i) => i.kind === kind)
          .map((i) => (
            <li
              key={i.id}
              className={`px-5 py-4 ${i.check ? "bg-[#FBF1DC]" : ""}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{i.label}</p>
                  <p className="truncate text-sm text-[#5C6B72]">{i.source}</p>
                </div>
                <label className="flex items-center gap-1">
                  <span className="sr-only">{i.label} amount</span>
                  <span aria-hidden className="text-[#5C6B72]">
                    ₹
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={i.amount}
                    onChange={(e) =>
                      update(i.id, { amount: Number(e.target.value) || 0 })
                    }
                    className="w-32 rounded-md border border-[#B9C6C3] bg-white px-2 py-1 text-right tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0E5A5A]"
                  />
                </label>
              </div>
              {i.check && (
                <div className="mt-3 flex items-center justify-between gap-4 text-sm">
                  <p className="text-[#8A5A0B]">
                    The assistant isn’t sure about this amount. Check it against
                    your document.
                  </p>
                  <button
                    onClick={() => update(i.id, { check: false })}
                    className="shrink-0 rounded-md border border-[#8A5A0B] px-3 py-1 text-[#8A5A0B] hover:bg-white"
                  >
                    This is correct
                  </button>
                </div>
              )}
            </li>
          ))}
      </ul>
    </section>
  );

  return (
    <Shell id={id} step={1}>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold">
        Check what we found
      </h1>
      <p className="mt-2 max-w-prose text-[#5C6B72]">
        Edit anything that’s wrong. Nothing is filed or changed on the portal
        until you approve it in the next step.
      </p>

      {group("income", "Income")}
      {group("deduction", "Deductions")}

      <button
        disabled={pending > 0}
        onClick={() => {
          // TODO: PATCH the confirmed items, then resume the agent graph.
          router.push(`/filing/${id}/approve`);
        }}
        className="mt-10 rounded-md bg-[#0E5A5A] px-5 py-2.5 font-medium text-white hover:bg-[#0b4a4a] disabled:cursor-not-allowed disabled:bg-[#B9C6C3]"
      >
        {pending > 0
          ? `Confirm ${pending} more ${pending === 1 ? "item" : "items"} to continue`
          : "Continue to approval"}
      </button>
    </Shell>
  );
}
