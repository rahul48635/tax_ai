import type { UserRow } from "../../lib/db-types";
import { describe, it, expect, vi } from "vitest";
import {
  listApprovals,
  resolveApproval,
  startFiling,
  type ApiCtx,
} from "../../lib/api/handlers";
import { createMockDeps } from "../mocks/services";
import { createFakeDb } from "../mocks/db";
import type { AgentDeps } from "../../lib/services/types";

const user: UserRow = {
  id: "u1",
  email: "a@b.c",
  name: "Aniket",
  pan: "ABCDE1234F",
};
const req = (body?: unknown) =>
  new Request("http://x/api", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

function ctx(userId: string | null = "u1", users = [user]) {
  const fake = createFakeDb(users);
  const mocks = createMockDeps();
  const c: ApiCtx = {
    db: fake.db,
    getUserId: async () => userId,
    buildDeps: () => mocks as unknown as AgentDeps,
  };
  return { c, ...fake, mocks };
}

describe("approvals api", () => {
  it("401s without a user", async () => {
    const { c } = ctx(null);
    expect((await listApprovals(req(), c)).status).toBe(401);
    expect(
      (await resolveApproval(req({ id: "a", approved: true }), c)).status,
    ).toBe(401);
  });

  it("lists only the caller's pending approvals", async () => {
    const { c, tables } = ctx();
    await c.db.approval.create({
      data: { userId: "u1", step: "submit_return", payload: {} },
    });
    await c.db.approval.create({
      data: { userId: "u2", step: "submit_return", payload: {} },
    });
    const body = await (await listApprovals(req(), c)).json();
    expect(body.approvals).toHaveLength(1);
    expect(tables.approvals).toHaveLength(2);
  });

  it("resolves once, and only for the owner", async () => {
    const { c, tables } = ctx();
    const a = await c.db.approval.create({
      data: { userId: "u1", step: "submit_return", payload: {} },
    });
    const other = await c.db.approval.create({
      data: { userId: "u2", step: "submit_return", payload: {} },
    });

    expect(
      (await resolveApproval(req({ id: other.id, approved: true }), c)).status,
    ).toBe(404);
    expect(
      (await resolveApproval(req({ id: a.id, approved: true }), c)).status,
    ).toBe(200);
    expect(
      (await resolveApproval(req({ id: a.id, approved: false }), c)).status,
    ).toBe(404);
    expect(tables.approvals[0]!.approved).toBe(true);
  });

  it("400s on a bad body", async () => {
    const { c } = ctx();
    expect((await resolveApproval(req({ id: 5 }), c)).status).toBe(400);
  });
});

describe("startFiling", () => {
  it("runs the agent and returns its result", async () => {
    const { c } = ctx();
    const res = await startFiling(req({}), c);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("filed");
  });

  it("passes the profile from the database to the portal", async () => {
    const { c, mocks } = ctx();
    await startFiling(req({ assessmentYear: "2026-27" }), c);
    expect(mocks.portal.submit.mock.calls[0]![0]).toMatchObject({
      pan: "ABCDE1234F",
      name: "Aniket",
      assessmentYear: "2026-27",
    });
  });

  it("requires login, a known user and a valid PAN", async () => {
    expect((await startFiling(req({}), ctx(null).c)).status).toBe(401);
    expect((await startFiling(req({}), ctx("nobody").c)).status).toBe(404);
    expect(
      (await startFiling(req({}), ctx("u1", [{ ...user, pan: "bad" }]).c))
        .status,
    ).toBe(400);
    expect(
      (await startFiling(req({}), ctx("u1", [{ ...user, pan: null }]).c))
        .status,
    ).toBe(400);
  });

  it("rejects a malformed assessment year", async () => {
    expect(
      (await startFiling(req({ assessmentYear: "26" }), ctx().c)).status,
    ).toBe(400);
  });

  it("hides internal errors", async () => {
    const { c, mocks } = ctx();
    mocks.portal.submit.mockRejectedValue(new Error("secret db password"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await startFiling(req({}), c);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret");
  });
});
