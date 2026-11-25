import { z } from "zod";
import type {
  DocumentExtractor,
  ExtractedIncome,
  UploadedDocument,
} from "./types";

const money = z.number().nonnegative();

export const extractedIncomeSchema = z.object({
  salary: money.describe("Gross salary for the year in INR"),
  interest: money.describe("Total interest income (savings, FD) in INR"),
  otherIncome: money.describe("Any other taxable income in INR"),
  tdsDeducted: money.describe("Total TDS deducted for the year in INR"),
  deductions: z.object({
    section80C: money,
    section80D: money,
    other: money.describe("Other Chapter VI-A deductions in INR"),
  }),
});

/** Minimal shape of a LangChain chat model that supports structured output (e.g. ChatGroq). */
export interface StructuredModel {
  withStructuredOutput(schema: z.ZodType): {
    invoke(input: string): Promise<unknown>;
  };
}

const MAX_CHARS_PER_DOC = 40_000;

async function defaultToText(content: Buffer): Promise<string> {
  if (content.subarray(0, 4).toString() === "%PDF") {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(new Uint8Array(content), {
      mergePages: true,
    });
    return text;
  }
  return content.toString("utf8");
}

export interface ExtractorOptions {
  model: StructuredModel;
  toText?: (content: Buffer) => Promise<string>;
}

export function createExtractor({
  model,
  toText = defaultToText,
}: ExtractorOptions): DocumentExtractor {
  const structured = model.withStructuredOutput(extractedIncomeSchema);

  return {
    async extract(
      docs: { doc: UploadedDocument; content: Buffer }[],
    ): Promise<ExtractedIncome> {
      const parts = await Promise.all(
        docs.map(async ({ doc, content }) => {
          const text = (await toText(content)).slice(0, MAX_CHARS_PER_DOC);
          return `--- ${doc.kind.toUpperCase()} (${doc.fileName}) ---\n${text}`;
        }),
      );

      const prompt = [
        "Extract the taxpayer's income details for an Indian income tax return from the documents below.",
        "All amounts are annual, in INR, as plain numbers. Use 0 for anything not present; never guess.",
        "Count each figure once even if several documents repeat it.",
        "",
        parts.join("\n\n"),
      ].join("\n");

      // Validate again: never trust model output to match the schema.
      return extractedIncomeSchema.parse(await structured.invoke(prompt));
    },
  };
}
