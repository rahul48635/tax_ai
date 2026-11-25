import { describe, it, expect, beforeEach } from "vitest";
import { fileReturn } from "@/lib/agent/filereturn";
import { runGraph } from "../../lib/agent/graph";
import type { AgentDeps } from "../../lib/services/types";
import { createMockDeps, profile, income } from "../mocks/services";

// The plain orchestrator and the LangGraph version must behave identically.
describe.each([
  ["fileReturn", fileReturn],
  ["LangGraph", runGraph],
] as const)("%s", (_name, run) => {
  let m: ReturnType<typeof createMockDeps>;
  const deps = () => m as unknown as AgentDeps;
  beforeEach(() => {
    m = createMockDeps();
  });

  it("files the return end to end when the user approves every step", async () => {
    const res = await run(deps(), profile);
    expect(res.status).toBe("filed");
    expect(m.approval.request.mock.calls.map((c) => c[0])).toEqual([
      "confirm_extracted_data",
      "confirm_computation",
      "submit_return",
    ]);
    expect(m.returns.updateStatus.mock.calls.map((c) => c[1])).toEqual([
      "approved",
      "submitted",
      "verified",
    ]);
    expect(m.returns.saveReceipt).toHaveBeenCalledWith(
      "draft_1",
      expect.objectContaining({ acknowledgementNumber: "ACK123" }),
    );
  });

  it("returns no_documents and does nothing else when nothing is uploaded", async () => {
    m.storage.getDocuments.mockResolvedValue([]);
    expect(await run(deps(), profile)).toEqual({ status: "no_documents" });
    expect(m.extractor.extract).not.toHaveBeenCalled();
    expect(m.approval.request).not.toHaveBeenCalled();
  });

  it("passes decrypted document content to the extractor", async () => {
    await run(deps(), profile);
    expect(m.extractor.extract.mock.calls[0]![0][0].content.toString()).toBe(
      "pdf-bytes",
    );
  });

  it("computes both regimes and saves the cheaper one", async () => {
    await run(deps(), profile);
    expect(m.calculator.compute).toHaveBeenCalledWith(income, "old");
    expect(m.calculator.compute).toHaveBeenCalledWith(income, "new");
    expect(m.returns.saveDraft.mock.calls[0]![2].regime).toBe("new");
  });

  it("prefers the new regime on a tie", async () => {
    m.calculator.compute.mockImplementation(
      async (_i: unknown, regime: string) => ({
        regime,
        taxableIncome: 0,
        totalTax: 0,
        taxPayable: 0,
        refundDue: 0,
        breakdown: {},
      }),
    );
    await run(deps(), profile);
    expect(m.returns.saveDraft.mock.calls[0]![2].regime).toBe("new");
  });

  it.each([
    "confirm_extracted_data",
    "confirm_computation",
    "submit_return",
  ] as const)(
    "stops and never submits if the user rejects %s",
    async (step) => {
      m.approval.request.mockImplementation(async (s: string) => s !== step);
      expect(await run(deps(), profile)).toEqual({
        status: "cancelled",
        at: step,
      });
      expect(m.portal.submit).not.toHaveBeenCalled();
    },
  );

  it("does not save a draft before the computation is approved", async () => {
    m.approval.request.mockImplementation(
      async (s: string) => s !== "confirm_computation",
    );
    await run(deps(), profile);
    expect(m.returns.saveDraft).not.toHaveBeenCalled();
  });

  it("leaves status at submitted when e-verification fails", async () => {
    m.portal.eVerify.mockResolvedValue({ verified: false });
    const res = await run(deps(), profile);
    expect(res).toMatchObject({ status: "filed", verified: false });
    expect(m.returns.updateStatus.mock.calls.map((c) => c[1])).toEqual([
      "approved",
      "submitted",
    ]);
  });

  it("propagates portal errors without marking the return submitted", async () => {
    m.portal.submit.mockRejectedValue(new Error("portal down"));
    await expect(run(deps(), profile)).rejects.toThrow("portal down");
    expect(m.returns.updateStatus.mock.calls.map((c) => c[1])).toEqual([
      "approved",
    ]);
  });
});
