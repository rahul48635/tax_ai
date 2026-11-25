import type { Db, ReturnRow } from "../db-types";
import type {
  DraftReturn,
  ExtractedIncome,
  ReturnRepository,
  TaxComputation,
} from "./types";

const toDraft = (r: ReturnRow): DraftReturn => ({
  id: r.id,
  userId: r.userId,
  status: r.status as DraftReturn["status"],
  income: r.income as ExtractedIncome,
  computation: r.computation as TaxComputation,
});

export function createReturnRepository(db: Db): ReturnRepository {
  return {
    async saveDraft(userId, income, computation) {
      return toDraft(
        await db.return.create({
          data: { userId, status: "draft", income, computation },
        }),
      );
    },
    async updateStatus(id, status) {
      await db.return.update({ where: { id }, data: { status } });
    },
    async saveReceipt(id, receipt) {
      await db.return.update({
        where: { id },
        data: {
          ackNumber: receipt.acknowledgementNumber,
          submittedAt: new Date(receipt.submittedAt),
        },
      });
    },
  };
}
