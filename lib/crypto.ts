import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export interface Encrypted {
  data: Buffer;
  iv: string;
  authTag: string;
}

/** ENCRYPTION_KEY must be 32 bytes as 64 hex chars (e.g. `openssl rand -hex 32`). */
export function parseKey(hex: string | undefined): Buffer {
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

export function encrypt(plain: Buffer, key: Buffer): Encrypted {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return {
    data,
    iv: iv.toString("hex"),
    authTag: cipher.getAuthTag().toString("hex"),
  };
}

/** Throws if the key is wrong or the data was tampered with (GCM auth check). */
export function decrypt(
  enc: { data: Uint8Array; iv: string; authTag: string },
  key: Buffer,
): Buffer {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(enc.iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(enc.authTag, "hex"));
  return Buffer.concat([decipher.update(enc.data), decipher.final()]);
}
