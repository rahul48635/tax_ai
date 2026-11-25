import { describe, it, expect, vi } from "vitest";
import { createExtractor } from "../../lib/services/extractor";
import { doc, income } from "../mocks/services";

const fakeModel = (result: unknown) => {
  const invoke = vi.fn().mockResolvedValue(result);
  return {
    model: { withStructuredOutput: vi.fn().mockReturnValue({ invoke }) },
    invoke,
  };
};
const toText = async (b: Buffer) => b.toString();

describe("extractor", () => {
  it("returns validated structured output", async () => {
    const { model } = fakeModel(income);
    const ex = createExtractor({ model, toText });
    expect(
      await ex.extract([{ doc, content: Buffer.from("form 16 text") }]),
    ).toEqual(income);
  });

  it("puts every document's text in the prompt", async () => {
    const { model, invoke } = fakeModel(income);
    await createExtractor({ model, toText }).extract([
      { doc, content: Buffer.from("AAA") },
      {
        doc: { ...doc, kind: "ais", fileName: "ais.pdf" },
        content: Buffer.from("BBB"),
      },
    ]);
    const prompt = invoke.mock.calls[0]![0] as string;
    expect(prompt).toContain("AAA");
    expect(prompt).toContain("BBB");
    expect(prompt).toContain("AIS (ais.pdf)");
  });

  it("truncates very long documents", async () => {
    const { model, invoke } = fakeModel(income);
    await createExtractor({ model, toText }).extract([
      { doc, content: Buffer.from("x".repeat(100_000)) },
    ]);
    expect((invoke.mock.calls[0]![0] as string).length).toBeLessThan(45_000);
  });

  it.each([
    ["negative amount", { ...income, salary: -1 }],
    ["missing field", { salary: 1 }],
    ["string amount", { ...income, interest: "15000" }],
  ])("rejects malformed model output: %s", async (_n, bad) => {
    const { model } = fakeModel(bad);
    await expect(
      createExtractor({ model, toText }).extract([
        { doc, content: Buffer.from("x") },
      ]),
    ).rejects.toThrow();
  });

  it("reads plain text files by default", async () => {
    const { model, invoke } = fakeModel(income);
    await createExtractor({ model }).extract([
      { doc, content: Buffer.from("hello text") },
    ]);
    expect(invoke.mock.calls[0]![0]).toContain("hello text");
  });
});
