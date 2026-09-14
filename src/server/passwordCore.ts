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

/**
 * Placeholder stored in `User.passwordHash` for an owner-role user created
 * via the invitation flow (src/server/invitations.ts) who has not yet
 * accepted it. Deliberately not a dummy/generated password: `hashPassword`
 * always produces a `salt:hash` string, and `verifyPassword` splits on ":"
 * before doing any scrypt work - this sentinel has no ":" at all, so it
 * fails that split immediately and `verifyPassword` returns false for every
 * input without ever reaching scrypt. No password exists for this account
 * until the invitation is accepted and a real hashPassword() result
 * replaces this value.
 */
export const NO_PASSWORD_SET_HASH = "invitation-pending-no-password-set";

export const MIN_PASSWORD_LENGTH = 10;

/**
 * Returns a user-facing locale-aware error, or null if the password is
 * acceptable. Deliberately simple - length only, no arbitrary complexity
 * rules. `locale` defaults to "de" so `prisma/seed.ts` (a plain Node/tsx
 * script, not part of the i18n-aware app) keeps its original German
 * behaviour without needing to import `@/i18n` itself.
 */
export function passwordStrengthError(password: string, locale: "de" | "en" = "de"): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return locale === "en"
      ? `The password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
      : `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
  }
  return null;
}
