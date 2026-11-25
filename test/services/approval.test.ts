import { describe, it, expect } from "vitest";
import { createApprovalService } from "../../lib/services/approval";
import { createFakeDb } from "../mocks/db";

function setup(
  onSleep?: (n: number, t: ReturnType<typeof createFakeDb>["tables"]) => void,
) {
  const { db, tables } = createFakeDb();
  let clock = 0;
  let sleeps = 0;
  const svc = createApprovalService({
    db,
    userId: "u1",
    pollIntervalMs: 1000,
    timeoutMs: 5000,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
      onSleep?.(++sleeps, tables);
    },
  });
  return { svc, tables };
}

describe("approval", () => {
  it("creates a pending approval and resolves true when the user approves", async () => {
    const { svc, tables } = setup((n, t) => {
      if (n === 2) {
        t.approvals[0]!.approved = true;
      }
    });
    expect(await svc.request("submit_return", { x: 1 })).toBe(true);
    expect(tables.approvals[0]).toMatchObject({
      userId: "u1",
      step: "submit_return",
      payload: { x: 1 },
    });
  });

  it("resolves false when the user rejects", async () => {
    const { svc } = setup((n, t) => {
      if (n === 1) t.approvals[0]!.approved = false;
    });
    expect(await svc.request("confirm_computation", {})).toBe(false);
  });

  it("times out as a rejection and closes the approval", async () => {
    const { svc, tables } = setup();
    expect(await svc.request("confirm_extracted_data", {})).toBe(false);
    expect(tables.approvals[0]!.approved).toBe(false);
    expect(tables.approvals[0]!.resolvedAt).toBeInstanceOf(Date);
  });
});
