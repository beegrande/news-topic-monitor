import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 256-bit key from the secret using scrypt
 */
function deriveKey(secret: string): Buffer {
  return scryptSync(secret, "newsmonitor-api-key-salt", KEY_LENGTH);
}

/**
 * Encrypts a string using AES-256-GCM
 * Returns a base64-encoded string containing: IV + AUTH_TAG + CIPHERTEXT
 */
export function encrypt(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Combine IV + AUTH_TAG + CIPHERTEXT
  const combined = Buffer.concat([iv, authTag, encrypted]);

  return combined.toString("base64");
}

/**
 * Decrypts a base64-encoded string that was encrypted with encrypt()
 */
export function decrypt(encryptedBase64: string, secret: string): string {
  const key = deriveKey(secret);
  const combined = Buffer.from(encryptedBase64, "base64");

  // Extract IV, AUTH_TAG, and CIPHERTEXT
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}
