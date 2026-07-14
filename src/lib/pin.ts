import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

// Hash a PIN with scrypt + a per-PIN random salt. Format: "salt:hash" (hex).
// PINs are low-entropy (4 digits), so this is not strong security — it just
// avoids storing the PIN in plaintext. Real accounts would need proper auth.
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

// Constant-time comparison of a PIN against a stored "salt:hash".
export function verifyPin(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

export function isValidName(name: unknown): name is string {
  return typeof name === "string" && name.trim().length >= 1 && name.trim().length <= 40;
}
