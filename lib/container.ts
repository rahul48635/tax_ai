import { ChatGroq } from "@langchain/groq";
import { db } from "./db";
import { parseKey } from "./crypto";
import { createStorage } from "./services/storage";
import { createExtractor, type StructuredModel } from "./services/extractor";
import { calculator } from "./services/taxCalculator";
import { createReturnRepository } from "./services/returnRepository";
import { createPortalClient } from "./services/irtPortal";
import { createApprovalService } from "./services/approval";
import type { AgentDeps } from "./services/types";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

/** Wires the real services for one user. Throws early if configuration is missing. */
export function buildDeps(userId: string): AgentDeps {
  const model = new ChatGroq({
    model: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
    temperature: 0,
  });
  return {
    storage: createStorage(db, parseKey(process.env.ENCRYPTION_KEY)),
    extractor: createExtractor({ model: model as unknown as StructuredModel }),
    calculator,
    returns: createReturnRepository(db),
    portal: createPortalClient({
      baseUrl: requireEnv("ERI_BASE_URL"),
      apiKey: requireEnv("ERI_API_KEY"),
    }),
    approval: createApprovalService({ db, userId }),
  };
}
