import type {
  ExtractedIncome,
  Regime,
  TaxCalculator,
  TaxComputation,
} from "./types";

// Rules for FY 2025-26 (AY 2026-27), resident individual under 60, Income-tax Act 1961.
// Not handled: surcharge (>50L is rejected), senior-citizen slabs, special-rate capital gains.
// Re-check these numbers each assessment year.

type Slabs = readonly (readonly [upTo: number, rate: number])[];

const NEW_SLABS: Slabs = [
  [400_000, 0],
  [800_000, 0.05],
  [1_200_000, 0.1],
  [1_600_000, 0.15],
  [2_000_000, 0.2],
  [2_400_000, 0.25],
  [Infinity, 0.3],
];
const OLD_SLABS: Slabs = [
  [250_000, 0],
  [500_000, 0.05],
  [1_000_000, 0.2],
  [Infinity, 0.3],
];

const STD_DEDUCTION = { new: 75_000, old: 50_000 } as const;
const CAP_80C = 150_000;
const CAP_80D = 25_000;
const REBATE = {
  new: { limit: 1_200_000, max: 60_000 },
  old: { limit: 500_000, max: 12_500 },
} as const;
const CESS = 0.04;
const SURCHARGE_THRESHOLD = 5_000_000;

const round10 = (n: number) => Math.round(n / 10) * 10; // sections 288A / 288B

function slabTax(taxable: number, slabs: Slabs): number {
  let tax = 0;
  let prev = 0;
  for (const [upTo, rate] of slabs) {
    if (taxable > prev) tax += (Math.min(taxable, upTo) - prev) * rate;
    prev = upTo;
  }
  return Math.round(tax);
}

export function computeTax(
  income: ExtractedIncome,
  regime: Regime,
): TaxComputation {
  const gross = income.salary + income.interest + income.otherIncome;
  if (gross > SURCHARGE_THRESHOLD) {
    throw new Error(
      "Income above ₹50 lakh needs surcharge, which this calculator does not support",
    );
  }

  const standardDeduction = Math.min(STD_DEDUCTION[regime], income.salary);
  const chapterVIA =
    regime === "old"
      ? Math.min(income.deductions.section80C, CAP_80C) +
        Math.min(income.deductions.section80D, CAP_80D) +
        income.deductions.other
      : 0;

  const taxableIncome = round10(
    Math.max(0, gross - standardDeduction - chapterVIA),
  );
  const tax = slabTax(taxableIncome, regime === "new" ? NEW_SLABS : OLD_SLABS);

  const { limit, max } = REBATE[regime];
  let rebate = 0;
  if (taxableIncome <= limit) {
    rebate = Math.min(tax, max);
  } else if (regime === "new") {
    // Marginal relief: tax can't exceed the income above ₹12 lakh.
    rebate = Math.max(0, tax - (taxableIncome - limit));
  }

  const taxAfterRebate = tax - rebate;
  const cess = Math.round(taxAfterRebate * CESS);
  const totalTax = round10(taxAfterRebate + cess);

  return {
    regime,
    taxableIncome,
    totalTax,
    taxPayable: Math.max(0, totalTax - income.tdsDeducted),
    refundDue: Math.max(0, income.tdsDeducted - totalTax),
    breakdown: {
      grossIncome: gross,
      standardDeduction,
      chapterVIA,
      slabTax: tax,
      rebate,
      cess,
      totalTax,
    },
  };
}

export const calculator: TaxCalculator = {
  async compute(income, regime) {
    return computeTax(income, regime);
  },
};
