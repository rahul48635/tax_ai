import { z } from "zod";
import type { ItrPortalClient } from "./types";

// The Income Tax Department has no public API for individuals: submission and e-verification
// go through a registered e-Return Intermediary (ERI) — either your own ERI registration or an
// ERI/gateway provider. This client talks to a gateway that exposes the two calls below.
// The paths and payloads here are THIS APP'S gateway contract, not the department's spec
// (see the ERI API specification on incometax.gov.in) — adapt them to your provider.

const receiptSchema = z.object({
  acknowledgementNumber: z.string().min(1),
  submittedAt: z.string().min(1),
});
const verifySchema = z.object({ verified: z.boolean() });

export interface PortalOptions {
  baseUrl: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export function createPortalClient({
  baseUrl,
  apiKey,
  fetchImpl = fetch,
  timeoutMs = 60_000,
}: PortalOptions): ItrPortalClient {
  async function post(path: string, body: unknown): Promise<unknown> {
    const res = await fetchImpl(`${baseUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok)
      throw new Error(`ITR gateway ${path} failed with status ${res.status}`);
    return res.json();
  }

  return {
    async submit(profile, draft) {
      const json = await post("/returns/submit", {
        pan: profile.pan,
        name: profile.name,
        assessmentYear: profile.assessmentYear,
        regime: draft.computation.regime,
        income: draft.income,
        computation: draft.computation,
      });
      return receiptSchema.parse(json);
    },

    async eVerify(ack) {
      return verifySchema.parse(
        await post(`/returns/${encodeURIComponent(ack)}/e-verify`, {}),
      );
    },
  };
}
