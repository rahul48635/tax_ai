import { vi } from "vitest";
import type {
  AgentDeps,
  DraftReturn,
  ExtractedIncome,
  TaxComputation,
  TaxpayerProfile,
  UploadedDocument,
} from "../../lib/services/types";

export const profile: TaxpayerProfile = {
  userId: "user_1",
  pan: "ABCDE1234F",
  name: "Test User",
  assessmentYear: "2026-27",
};

export const doc: UploadedDocument = {
  id: "doc_1",
  userId: "user_1",
  kind: "form16",
  fileName: "form16.pdf",
};

export const income: ExtractedIncome = {
  salary: 1_200_000,
  interest: 15_000,
  otherIncome: 0,
  tdsDeducted: 90_000,
  deductions: { section80C: 150_000, section80D: 25_000, other: 0 },
};

export const computation = (
  regime: "old" | "new",
  totalTax: number,
): TaxComputation => ({
  regime,
  taxableIncome: 1_000_000,
  totalTax,
  taxPayable: totalTax,
  refundDue: 0,
  breakdown: {},
});

export const draft: DraftReturn = {
  id: "draft_1",
  userId: "user_1",
  status: "draft",
  income,
  computation: computation("new", 60_000),
};

/** Fresh set of mocks with happy-path defaults. Override per test. */
export function createMockDeps(): {
  [K in keyof AgentDeps]: {
    [M in keyof AgentDeps[K]]: ReturnType<typeof vi.fn>;
  };
} {
  return {
    storage: {
      getDocuments: vi.fn().mockResolvedValue([doc]),
      readDecrypted: vi.fn().mockResolvedValue(Buffer.from("pdf-bytes")),
      saveDocument: vi.fn().mockResolvedValue(doc),
    },
    extractor: { extract: vi.fn().mockResolvedValue(income) },
    calculator: {
      compute: vi
        .fn()
        .mockImplementation(async (_i, regime) =>
          computation(regime, regime === "new" ? 60_000 : 80_000),
        ),
    },
    returns: {
      saveDraft: vi.fn().mockResolvedValue(draft),
      updateStatus: vi.fn().mockResolvedValue(undefined),
      saveReceipt: vi.fn().mockResolvedValue(undefined),
    },
    portal: {
      submit: vi
        .fn()
        .mockResolvedValue({
          acknowledgementNumber: "ACK123",
          submittedAt: "2026-11-25T00:00:00Z",
        }),
      eVerify: vi.fn().mockResolvedValue({ verified: true }),
    },
    approval: { request: vi.fn().mockResolvedValue(true) },
  } as never;
}
