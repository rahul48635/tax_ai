import { describe, it, expect } from "vitest";
import { createReturnRepository } from "../../lib/services/returnRepository";
import { computation, income } from "../mocks/services";
import { createFakeDb } from "../mocks/db";

describe("returnRepository", () => {
  it("saves a draft and returns it typed", async () => {
    const { db, tables } = createFakeDb();
    const draft = await createReturnRepository(db).saveDraft(
      "u1",
      income,
      computation("new", 5),
    );
    expect(draft).toMatchObject({ userId: "u1", status: "draft", income });
    expect(tables.returns).toHaveLength(1);
  });

  it("updates status", async () => {
    const { db, tables } = createFakeDb();
    const repo = createReturnRepository(db);
    const d = await repo.saveDraft("u1", income, computation("new", 5));
    await repo.updateStatus(d.id, "submitted");
    expect(tables.returns[0]!.status).toBe("submitted");
  });

  it("saves the receipt", async () => {
    const { db, tables } = createFakeDb();
    const repo = createReturnRepository(db);
    const d = await repo.saveDraft("u1", income, computation("new", 5));
    await repo.saveReceipt(d.id, {
      acknowledgementNumber: "ACK9",
      submittedAt: "2026-11-25T10:00:00Z",
    });
    expect(tables.returns[0]).toMatchObject({
      ackNumber: "ACK9",
      submittedAt: new Date("2026-11-25T10:00:00Z"),
    });
  });
});
