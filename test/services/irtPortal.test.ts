import { describe, it, expect, vi } from "vitest";
import { createPortalClient } from "../../lib/services/itrPortal";
import { draft, profile } from "../mocks/services";

const reply = (body: unknown, status = 200) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
const client = (fetchImpl: typeof fetch) =>
  createPortalClient({ baseUrl: "https://eri.test/", apiKey: "k", fetchImpl });

describe("itrPortal", () => {
  it("submits with auth and returns the receipt", async () => {
    const f = reply({
      acknowledgementNumber: "A1",
      submittedAt: "2026-11-25T00:00:00Z",
    });
    const receipt = await client(f as never).submit(profile, draft);
    expect(receipt.acknowledgementNumber).toBe("A1");
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe("https://eri.test/returns/submit");
    expect(init.headers.authorization).toBe("Bearer k");
    expect(JSON.parse(init.body)).toMatchObject({
      pan: profile.pan,
      assessmentYear: "2026-27",
    });
  });

  it("e-verifies by acknowledgement number", async () => {
    const f = reply({ verified: true });
    expect(await client(f as never).eVerify("A/1")).toEqual({ verified: true });
    expect(f.mock.calls[0]![0]).toBe("https://eri.test/returns/A%2F1/e-verify");
  });

  it("throws on HTTP errors", async () => {
    await expect(
      client(reply({}, 502) as never).submit(profile, draft),
    ).rejects.toThrow(/502/);
  });

  it("throws on malformed responses", async () => {
    await expect(
      client(reply({ nope: 1 }) as never).submit(profile, draft),
    ).rejects.toThrow();
  });
});
