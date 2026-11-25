"use client";

import { useCallback, useEffect, useState } from "react";

interface Approval {
  id: string;
  step: string;
  payload: unknown;
  createdAt: string;
}

const LABELS: Record<string, string> = {
  confirm_extracted_data: "Confirm the details extracted from your documents",
  confirm_computation: "Confirm the tax computation",
  submit_return: "Approve submitting your return",
};

// Local dev only: lib/session.ts accepts this header outside production.
const headers = (): Record<string, string> => {
  const dev = process.env.NEXT_PUBLIC_DEV_USER_ID;
  return {
    "content-type": "application/json",
    ...(dev ? { "x-user-id": dev } : {}),
  };
};

export default function ReviewPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [status, setStatus] = useState<string>("");
  const [running, setRunning] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/approvals", { headers: headers() });
    if (res.ok) setApprovals((await res.json()).approvals);
  }, []);

  useEffect(() => {
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  async function decide(id: string, approved: boolean) {
    await fetch("/api/approvals", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ id, approved }),
    });
    refresh();
  }

  async function start() {
    setRunning(true);
    setStatus("Working… approvals will appear below.");
    try {
      const res = await fetch("/api/agent/file-return", {
        method: "POST",
        headers: headers(),
        body: "{}",
      });
      const body = await res.json();
      setStatus(
        !res.ok
          ? `Error: ${body.error}`
          : body.status === "filed"
            ? `Filed. Acknowledgement ${body.receipt.acknowledgementNumber}${body.verified ? " (e-verified)" : " — e-verification pending"}`
            : body.status === "no_documents"
              ? "Upload your documents first."
              : `Stopped: you declined at "${LABELS[body.at] ?? body.at}".`,
      );
    } catch {
      setStatus("Something went wrong.");
    } finally {
      setRunning(false);
      refresh();
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Review &amp; approve</h1>
      <button
        onClick={start}
        disabled={running}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {running ? "Filing in progress…" : "Start filing"}
      </button>
      {status && <p className="text-sm text-zinc-600">{status}</p>}

      {approvals.length === 0 && (
        <p className="text-zinc-500">Nothing is waiting for your approval.</p>
      )}
      {approvals.map((a) => (
        <section key={a.id} className="space-y-3 rounded border p-4">
          <h2 className="font-medium">{LABELS[a.step] ?? a.step}</h2>
          <pre className="max-h-64 overflow-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
            {JSON.stringify(a.payload, null, 2)}
          </pre>
          <div className="flex gap-2">
            <button
              onClick={() => decide(a.id, true)}
              className="rounded bg-green-600 px-3 py-1.5 text-white"
            >
              Approve
            </button>
            <button
              onClick={() => decide(a.id, false)}
              className="rounded border px-3 py-1.5"
            >
              Reject
            </button>
          </div>
        </section>
      ))}
    </main>
  );
}
