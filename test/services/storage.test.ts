import { describe, it, expect } from "vitest";
import { parseKey } from "../../lib/crypto";
import { createStorage } from "../../lib/services/storage";
import { createFakeDb } from "../mocks/db";

const key = parseKey("ab".repeat(32));

describe("storage", () => {
  it("stores documents encrypted and reads them back decrypted", async () => {
    const { db, tables } = createFakeDb();
    const storage = createStorage(db, key);
    const doc = await storage.saveDocument(
      "u1",
      "form16",
      "f16.pdf",
      Buffer.from("plain text"),
    );

    expect(Buffer.from(tables.documents[0]!.data).toString()).not.toContain(
      "plain text",
    );
    expect(doc).toEqual({
      id: doc.id,
      userId: "u1",
      kind: "form16",
      fileName: "f16.pdf",
    });
    expect((await storage.readDecrypted(doc)).toString()).toBe("plain text");
  });

  it("lists only the user's documents", async () => {
    const { db } = createFakeDb();
    const storage = createStorage(db, key);
    await storage.saveDocument("u1", "ais", "a.pdf", Buffer.from("1"));
    await storage.saveDocument("u2", "ais", "b.pdf", Buffer.from("2"));
    expect((await storage.getDocuments("u1")).map((d) => d.fileName)).toEqual([
      "a.pdf",
    ]);
  });

  it("refuses to read another user's document", async () => {
    const { db } = createFakeDb();
    const storage = createStorage(db, key);
    const doc = await storage.saveDocument(
      "u1",
      "ais",
      "a.pdf",
      Buffer.from("1"),
    );
    await expect(
      storage.readDecrypted({ ...doc, userId: "u2" }),
    ).rejects.toThrow(/not found/);
  });

  it("fails to read with the wrong key", async () => {
    const { db } = createFakeDb();
    const doc = await createStorage(db, key).saveDocument(
      "u1",
      "ais",
      "a.pdf",
      Buffer.from("1"),
    );
    await expect(
      createStorage(db, parseKey("cd".repeat(32))).readDecrypted(doc),
    ).rejects.toThrow();
  });
});
