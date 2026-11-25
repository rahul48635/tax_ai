import { describe, it, expect } from "vitest";
import { decrypt, encrypt, parseKey } from "../lib/crypto";

const key = parseKey("00".repeat(32));

describe("crypto", () => {
  it("round-trips data", () => {
    const enc = encrypt(Buffer.from("secret"), key);
    expect(decrypt(enc, key).toString()).toBe("secret");
  });
  it("uses a fresh IV each time", () => {
    expect(encrypt(Buffer.from("a"), key).iv).not.toBe(
      encrypt(Buffer.from("a"), key).iv,
    );
  });
  it("fails with the wrong key", () => {
    const enc = encrypt(Buffer.from("secret"), key);
    expect(() => decrypt(enc, parseKey("11".repeat(32)))).toThrow();
  });
  it("detects tampering", () => {
    const enc = encrypt(Buffer.from("secret"), key);
    enc.data[0] = enc.data[0]! ^ 1;
    expect(() => decrypt(enc, key)).toThrow();
  });
  it.each([undefined, "", "abc", "zz".repeat(32), "00".repeat(31)])(
    "rejects bad key %j",
    (k) => {
      expect(() => parseKey(k)).toThrow(/64 hex/);
    },
  );
});
