import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * The actual scrypt hashing logic, deliberately in a module WITHOUT the
 * `server-only` import guard: `prisma/seed.ts` runs as a plain Node/tsx
 * script (not inside Next's server runtime), and `server-only` throws
 * outside that context by design. `./password.ts` re-exports this with the
 * guard for use from the app; the seed script imports straight from here.
 */

const KEY_LENGTH = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(plain, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

/** Short, readable temporary password for admin-created owner logins - there
 *  is no invitation-email flow yet, so the admin relays this manually. */
export function generateTempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(10);
  let result = "";
  for (const byte of bytes) {
    result += alphabet[byte % alphabet.length];
  }
  return result;
}
