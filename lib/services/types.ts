// Service contracts for the ITR agent. Real implementations (Prisma, Gemini/Groq,
// S3/Neon, e-filing portal) will implement these; tests use the mocks in tests/mocks.

export type Regime = "old" | "new";

export interface TaxpayerProfile {
  userId: string;
  pan: string;
  name: string;
  assessmentYear: string; // e.g. "2026-27"
}

export type DocumentKind =
  | "form16"
  | "ais"
  | "form26as"
  | "bank_interest"
  | "other";

export interface UploadedDocument {
  id: string;
  userId: string;
  kind: DocumentKind;
  fileName: string;
}

export interface ExtractedIncome {
  salary: number;
  interest: number;
  otherIncome: number;
  tdsDeducted: number;
  deductions: { section80C: number; section80D: number; other: number };
}

export interface TaxComputation {
  regime: Regime;
  taxableIncome: number;
  /** Total tax liability incl. cess, before TDS. Used to compare regimes. */
  totalTax: number;
  /** totalTax minus TDS, if positive. */
  taxPayable: number;
  /** TDS minus totalTax, if positive. */
  refundDue: number;
  breakdown: Record<string, number>;
}

export interface DraftReturn {
  id: string;
  userId: string;
  status: "draft" | "approved" | "submitted" | "verified";
  income: ExtractedIncome;
  computation: TaxComputation;
}

export interface SubmissionReceipt {
  acknowledgementNumber: string;
  submittedAt: string;
}

export type ApprovalStep =
  | "confirm_extracted_data"
  | "confirm_computation"
  | "submit_return";

// --- Services -------------------------------------------------------------

export interface DocumentStorage {
  getDocuments(userId: string): Promise<UploadedDocument[]>;
  readDecrypted(doc: UploadedDocument): Promise<Buffer>;
  saveDocument(
    userId: string,
    kind: DocumentKind,
    fileName: string,
    content: Buffer,
  ): Promise<UploadedDocument>;
}

export interface DocumentExtractor {
  extract(
    docs: { doc: UploadedDocument; content: Buffer }[],
  ): Promise<ExtractedIncome>;
}

export interface TaxCalculator {
  compute(income: ExtractedIncome, regime: Regime): Promise<TaxComputation>;
}

export interface ReturnRepository {
  saveDraft(
    userId: string,
    income: ExtractedIncome,
    computation: TaxComputation,
  ): Promise<DraftReturn>;
  updateStatus(id: string, status: DraftReturn["status"]): Promise<void>;
  saveReceipt(id: string, receipt: SubmissionReceipt): Promise<void>;
}

export interface ItrPortalClient {
  submit(
    profile: TaxpayerProfile,
    draft: DraftReturn,
  ): Promise<SubmissionReceipt>;
  eVerify(ack: string): Promise<{ verified: boolean }>;
}

/** Human-in-the-loop gate. Resolves true only if the user explicitly approves. */
export interface ApprovalService {
  request(step: ApprovalStep, payload: unknown): Promise<boolean>;
}

export interface AgentDeps {
  storage: DocumentStorage;
  extractor: DocumentExtractor;
  calculator: TaxCalculator;
  returns: ReturnRepository;
  portal: ItrPortalClient;
  approval: ApprovalService;
}
