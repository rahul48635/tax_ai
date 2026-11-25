import type {
  AgentDeps,
  DraftReturn,
  Regime,
  SubmissionReceipt,
  TaxpayerProfile,
  TaxComputation,
} from "../services/types";

export type FileReturnResult =
  | {
      status: "filed";
      receipt: SubmissionReceipt;
      verified: boolean;
      draft: DraftReturn;
    }
  | { status: "no_documents" }
  | {
      status: "cancelled";
      at: "confirm_extracted_data" | "confirm_computation" | "submit_return";
    };

/**
 * Orchestrates the filing flow. Every step with side effects (saving, submitting)
 * is preceded by an explicit user approval. Anything else stops the run.
 */
export async function fileReturn(
  deps: AgentDeps,
  profile: TaxpayerProfile,
): Promise<FileReturnResult> {
  const docs = await deps.storage.getDocuments(profile.userId);
  if (docs.length === 0) return { status: "no_documents" };

  const contents = await Promise.all(
    docs.map(async (doc) => ({
      doc,
      content: await deps.storage.readDecrypted(doc),
    })),
  );
  const income = await deps.extractor.extract(contents);

  if (!(await deps.approval.request("confirm_extracted_data", income))) {
    return { status: "cancelled", at: "confirm_extracted_data" };
  }

  // Compute both regimes and pick the one with lower tax.
  const regimes: Regime[] = ["new", "old"]; // new first: ties keep the default regime
  const results: TaxComputation[] = await Promise.all(
    regimes.map((r) => deps.calculator.compute(income, r)),
  );
  const best = results.reduce((a, b) => (b.totalTax < a.totalTax ? b : a));

  if (
    !(await deps.approval.request("confirm_computation", { best, results }))
  ) {
    return { status: "cancelled", at: "confirm_computation" };
  }

  const draft = await deps.returns.saveDraft(profile.userId, income, best);

  if (!(await deps.approval.request("submit_return", draft))) {
    return { status: "cancelled", at: "submit_return" };
  }

  await deps.returns.updateStatus(draft.id, "approved");
  const receipt = await deps.portal.submit(profile, draft);
  await deps.returns.updateStatus(draft.id, "submitted");
  await deps.returns.saveReceipt(draft.id, receipt);

  const { verified } = await deps.portal.eVerify(receipt.acknowledgementNumber);
  if (verified) await deps.returns.updateStatus(draft.id, "verified");

  return { status: "filed", receipt, verified, draft };
}
