import { z } from "zod";
import { fileReturn } from "../agent/filereturn";
import type { Db } from "../db-types";
import type { AgentDeps } from "../services/types";

export interface ApiCtx {
  db: Db;
  getUserId(req: Request): Promise<string | null>;
  buildDeps(userId: string): AgentDeps;
}

const json = (body: unknown, status = 200) => Response.json(body, { status });

const resolveBody = z.object({ id: z.string().min(1), approved: z.boolean() });
const fileBody = z.object({
  assessmentYear: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .default("2026-27"),
});
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** GET /api/approvals — the caller's pending approvals. */
export async function listApprovals(req: Request, ctx: ApiCtx) {
  const userId = await ctx.getUserId(req);
  if (!userId) return json({ error: "Unauthorized" }, 401);
  const rows = await ctx.db.approval.findMany({
    where: { userId, approved: null },
    orderBy: { createdAt: "asc" },
  });
  return json({
    approvals: rows.map((r) => ({
      id: r.id,
      step: r.step,
      payload: r.payload,
      createdAt: r.createdAt,
    })),
  });
}

/** POST /api/approvals { id, approved } — resolves one pending approval, once. */
export async function resolveApproval(req: Request, ctx: ApiCtx) {
  const userId = await ctx.getUserId(req);
  if (!userId) return json({ error: "Unauthorized" }, 401);
  const body = resolveBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return json({ error: "Invalid body" }, 400);

  const { count } = await ctx.db.approval.updateMany({
    where: { id: body.data.id, userId, approved: null },
    data: { approved: body.data.approved, resolvedAt: new Date() },
  });
  return count === 0
    ? json({ error: "Approval not found or already resolved" }, 404)
    : json({ ok: true });
}

/** POST /api/agent/file-return — runs the agent; blocks until it finishes or the user declines. */
export async function startFiling(req: Request, ctx: ApiCtx) {
  const userId = await ctx.getUserId(req);
  if (!userId) return json({ error: "Unauthorized" }, 401);
  const body = fileBody.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return json({ error: "Invalid body" }, 400);

  const user = await ctx.db.user.findUnique({ where: { id: userId } });
  if (!user) return json({ error: "User not found" }, 404);
  if (!user.pan || !PAN.test(user.pan))
    return json({ error: "A valid PAN is required on the profile" }, 400);

  try {
    const result = await fileReturn(ctx.buildDeps(userId), {
      userId,
      pan: user.pan,
      name: user.name ?? user.email,
      assessmentYear: body.data.assessmentYear,
    });
    return json(result);
  } catch (err) {
    console.error("file-return failed", err);
    return json({ error: "Filing failed" }, 500);
  }
}
