import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { oauthEnv } from "./env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce, recommended for GCM

/**
 * Encrypts a plaintext string. Output format: base64(iv):base64(authTag):base64(ciphertext)
 * Safe to store directly in a TEXT/VARCHAR column.
 */
export function encryptToken(plaintext: string): string {
  const key = oauthEnv.encryptionKey;
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(
    ":"
  );
}

export function decryptToken(payload: string): string {
  const key = oauthEnv.encryptionKey;
  const [ivB64, authTagB64, ciphertextB64] = payload.split(":");

  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("[oauth/encryption] Malformed encrypted payload");
  }

  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString("utf8");
}

/** Convenience: encrypts a nullable token, passing through null/undefined untouched. */
export function encryptTokenOrNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return encryptToken(value);
}

export function decryptTokenOrNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return decryptToken(value);
}
