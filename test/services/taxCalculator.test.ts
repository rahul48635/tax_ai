import { describe, it, expect } from "vitest";
import { computeTax } from "../../lib/services/taxCalculator";
import type { ExtractedIncome } from "../../lib/services/types";

const inc = (
  over: Partial<ExtractedIncome> = {},
  ded: Partial<ExtractedIncome["deductions"]> = {},
): ExtractedIncome => ({
  salary: 0,
  interest: 0,
  otherIncome: 0,
  tdsDeducted: 0,
  deductions: { section80C: 0, section80D: 0, other: 0, ...ded },
  ...over,
});

describe("new regime", () => {
  it("is tax-free up to ₹12.75L salary (₹75k standard deduction + 87A rebate)", () => {
    const r = computeTax(inc({ salary: 1_275_000 }), "new");
    expect(r.taxableIncome).toBe(1_200_000);
    expect(r.totalTax).toBe(0);
  });

  it("matches a worked example: ₹12L salary", () => {
    expect(computeTax(inc({ salary: 1_200_000 }), "new").totalTax).toBe(0);
  });

  it("taxes ₹15L taxable income at ₹1,09,200 incl. cess", () => {
    // taxable 15,00,000: 20,000 + 40,000 + 45,000 = 1,05,000; cess 4,200
    const r = computeTax(inc({ salary: 1_575_000 }), "new");
    expect(r.taxableIncome).toBe(1_500_000);
    expect(r.totalTax).toBe(109_200);
  });

  it("applies marginal relief just above ₹12L", () => {
    // taxable 12,10,000: slab tax 61,500, relief caps tax at 10,000, cess 400
    const r = computeTax(inc({ salary: 1_285_000 }), "new");
    expect(r.taxableIncome).toBe(1_210_000);
    expect(r.totalTax).toBe(10_400);
  });

  it("ignores 80C/80D", () => {
    const a = computeTax(inc({ salary: 2_000_000 }), "new");
    const b = computeTax(
      inc({ salary: 2_000_000 }, { section80C: 150_000, section80D: 25_000 }),
      "new",
    );
    expect(b.totalTax).toBe(a.totalTax);
  });
});

describe("old regime", () => {
  it("is tax-free up to ₹5L taxable (87A)", () => {
    expect(computeTax(inc({ salary: 550_000 }), "old").totalTax).toBe(0);
  });

  it("taxes ₹10L taxable at ₹1,17,000 incl. cess", () => {
    // salary 10,50,000 - 50,000 std = 10,00,000: 12,500 + 1,00,000 = 1,12,500; cess 4,500
    const r = computeTax(inc({ salary: 1_050_000 }), "old");
    expect(r.taxableIncome).toBe(1_000_000);
    expect(r.totalTax).toBe(117_000);
  });

  it("caps 80C at ₹1.5L and 80D at ₹25k", () => {
    const r = computeTax(
      inc({ salary: 1_500_000 }, { section80C: 400_000, section80D: 90_000 }),
      "old",
    );
    expect(r.breakdown.chapterVIA).toBe(175_000);
    expect(r.taxableIncome).toBe(1_500_000 - 50_000 - 175_000);
  });
});

describe("common", () => {
  it("standard deduction never exceeds salary", () => {
    expect(
      computeTax(inc({ interest: 100_000 }), "new").breakdown.standardDeduction,
    ).toBe(0);
  });

  it("splits TDS into payable and refund", () => {
    const owes = computeTax(
      inc({ salary: 1_575_000, tdsDeducted: 50_000 }),
      "new",
    );
    expect(owes).toMatchObject({
      totalTax: 109_200,
      taxPayable: 59_200,
      refundDue: 0,
    });
    const refund = computeTax(
      inc({ salary: 1_200_000, tdsDeducted: 20_000 }),
      "new",
    );
    expect(refund).toMatchObject({
      totalTax: 0,
      taxPayable: 0,
      refundDue: 20_000,
    });
  });

  it("never goes negative", () => {
    expect(computeTax(inc(), "old").taxableIncome).toBe(0);
  });

  it("rejects income needing surcharge", () => {
    expect(() => computeTax(inc({ salary: 5_000_001 }), "new")).toThrow(
      /surcharge/,
    );
  });
});
