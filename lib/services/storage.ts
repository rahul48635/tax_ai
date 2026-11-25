import { decrypt, encrypt } from "../crypto";
import type { Db, DocumentRow } from "../db-types";
import type { DocumentKind, DocumentStorage, UploadedDocument } from "./types";

const toDoc = (r: DocumentRow): UploadedDocument => ({
  id: r.id,
  userId: r.userId,
  kind: r.kind as DocumentKind,
  fileName: r.fileName,
});

/** Documents are stored AES-256-GCM encrypted in Postgres and only decrypted on read. */
export function createStorage(db: Db, key: Buffer): DocumentStorage {
  return {
    async getDocuments(userId) {
      const rows = await db.document.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(toDoc);
    },

    async readDecrypted(doc) {
      // Scope by userId too, so a doc id from another user can never be read.
      const row = await db.document.findFirst({
        where: { id: doc.id, userId: doc.userId },
      });
      if (!row) throw new Error(`Document ${doc.id} not found`);
      return decrypt(row, key);
    },

    async saveDocument(userId, kind, fileName, content) {
      const enc = encrypt(content, key);
      const row = await db.document.create({
        data: {
          userId,
          kind,
          fileName,
          data: enc.data,
          iv: enc.iv,
          authTag: enc.authTag,
        },
      });
      return toDoc(row);
    },
  };
}
