import type { Db } from "../db-types";
import type { ApprovalService } from "./types";

export interface ApprovalOptions {
  db: Db;
  userId: string;
  pollIntervalMs?: number;
  /** After this long without an answer the request is rejected. */
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

/**
 * Creates a pending Approval row and waits until the user resolves it in the UI
 * (POST /api/approvals). Anything but an explicit approval — including a timeout — is "no".
 */
export function createApprovalService({
  db,
  userId,
  pollIntervalMs = 1_500,
  timeoutMs = 10 * 60_000,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  now = Date.now,
}: ApprovalOptions): ApprovalService {
  return {
    async request(step, payload) {
      const row = await db.approval.create({ data: { userId, step, payload } });
      const deadline = now() + timeoutMs;

      while (now() < deadline) {
        const current = await db.approval.findUnique({ where: { id: row.id } });
        if (current && current.approved !== null) return current.approved;
        await sleep(pollIntervalMs);
      }

      // Close it so it can't be approved later and silently do nothing.
      await db.approval.updateMany({
        where: { id: row.id, userId, approved: null },
        data: { approved: false, resolvedAt: new Date() },
      });
      return false;
    },
  };
}
