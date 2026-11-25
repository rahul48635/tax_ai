import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { FileReturnResult } from "./filereturn";
import type {
  AgentDeps,
  DraftReturn,
  ExtractedIncome,
  Regime,
  TaxComputation,
  TaxpayerProfile,
  UploadedDocument,
} from "../services/types";

// LangGraph version of lib/agent/fileReturn.ts. Same flow, same approval gates;
// `outcome` being set ends the run early.

const State = Annotation.Root({
  docs: Annotation<{ doc: UploadedDocument; content: Buffer }[]>(),
  income: Annotation<ExtractedIncome>(),
  best: Annotation<TaxComputation>(),
  draft: Annotation<DraftReturn>(),
  outcome: Annotation<FileReturnResult | undefined>(),
});
type S = typeof State.State;

export function buildGraph(deps: AgentDeps, profile: TaxpayerProfile) {
  const cancelled = (
    at: "confirm_extracted_data" | "confirm_computation" | "submit_return",
  ) => ({ outcome: { status: "cancelled", at } as const });

  return new StateGraph(State)
    .addNode("load", async () => {
      const docs = await deps.storage.getDocuments(profile.userId);
      if (docs.length === 0)
        return { outcome: { status: "no_documents" } as const };
      return {
        docs: await Promise.all(
          docs.map(async (doc) => ({
            doc,
            content: await deps.storage.readDecrypted(doc),
          })),
        ),
      };
    })
    .addNode("extract", async (s) => ({
      income: await deps.extractor.extract(s.docs),
    }))
    .addNode("approveData", async (s) =>
      (await deps.approval.request("confirm_extracted_data", s.income))
        ? {}
        : cancelled("confirm_extracted_data"),
    )
    .addNode("compute", async (s) => {
      const regimes: Regime[] = ["new", "old"];
      const results = await Promise.all(
        regimes.map((r) => deps.calculator.compute(s.income, r)),
      );
      return {
        best: results.reduce((a, b) => (b.totalTax < a.totalTax ? b : a)),
      };
    })
    .addNode("approveCalc", async (s) =>
      (await deps.approval.request("confirm_computation", { best: s.best }))
        ? {}
        : cancelled("confirm_computation"),
    )
    .addNode("saveDraft", async (s) => ({
      draft: await deps.returns.saveDraft(profile.userId, s.income, s.best),
    }))
    .addNode("approveSubmit", async (s) =>
      (await deps.approval.request("submit_return", s.draft))
        ? {}
        : cancelled("submit_return"),
    )
    .addNode("submitAndVerify", async (s) => {
      await deps.returns.updateStatus(s.draft.id, "approved");
      const receipt = await deps.portal.submit(profile, s.draft);
      await deps.returns.updateStatus(s.draft.id, "submitted");
      await deps.returns.saveReceipt(s.draft.id, receipt);
      const { verified } = await deps.portal.eVerify(
        receipt.acknowledgementNumber,
      );
      if (verified) await deps.returns.updateStatus(s.draft.id, "verified");
      return {
        outcome: {
          status: "filed",
          receipt,
          verified,
          draft: s.draft,
        } as const,
      };
    })
    .addEdge(START, "load")
    .addConditionalEdges("load", (s) => (s.outcome ? END : "extract"))
    .addEdge("extract", "approveData")
    .addConditionalEdges("approveData", (s) => (s.outcome ? END : "compute"))
    .addEdge("compute", "approveCalc")
    .addConditionalEdges("approveCalc", (s) => (s.outcome ? END : "saveDraft"))
    .addEdge("saveDraft", "approveSubmit")
    .addConditionalEdges("approveSubmit", (s) =>
      s.outcome ? END : "submitAndVerify",
    )
    .addEdge("submitAndVerify", END)
    .compile();
}

export async function runGraph(
  deps: AgentDeps,
  profile: TaxpayerProfile,
): Promise<FileReturnResult> {
  const state = await buildGraph(deps, profile).invoke({});
  if (!state.outcome) throw new Error("Graph finished without an outcome");
  return state.outcome;
}
