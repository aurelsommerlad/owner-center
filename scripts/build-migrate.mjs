#!/usr/bin/env node
/**
 * Runs before `next build` (see package.json's "build" script) so the
 * database schema is always in sync with prisma/migrations before the app
 * that reads it goes live - no manual `db:push`/`migrate deploy` step
 * needed on Vercel: as long as DATABASE_URL is configured for that
 * environment (Production/Preview), every deployment applies any pending
 * migrations automatically.
 *
 * Skips gracefully when DATABASE_URL is not set, rather than failing the
 * build - that keeps `npm run build` working in a fresh checkout or this
 * sandbox with no database configured at all, exactly as before.
 *
 * `dotenv/config` is loaded explicitly because this runs as plain Node
 * (not through Next.js, which loads .env files automatically) - needed for
 * local testing; on Vercel, DATABASE_URL is already a real process env var
 * at build time regardless.
 *
 * Retries on failure: a serverless/branching Postgres (this project's Neon
 * database included) can take a few seconds to wake a suspended compute
 * from cold, and `prisma migrate deploy` only waits 10s to acquire its
 * advisory lock before giving up with P1002 ("timed out trying to acquire
 * a postgres advisory lock") - a real production failure was traced to
 * exactly this. A woken-but-momentarily-slow database is transient, not a
 * real migration problem, so a short, bounded retry is the safe fix: a
 * genuinely broken/unreachable database still fails the build after these
 * attempts, it just isn't taken down by one slow cold start.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[build] DATABASE_URL not set - skipping `prisma migrate deploy` (fine without a database configured).");
  process.exit(0);
}

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 8000;

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

console.log("[build] DATABASE_URL is set - running `prisma migrate deploy`...");

let result;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  if (attempt > 1) {
    console.log(`[build] \`prisma migrate deploy\` attempt ${attempt}/${MAX_ATTEMPTS}...`);
  }

  result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (!result.error && result.status === 0) break;

  if (attempt < MAX_ATTEMPTS) {
    console.warn(
      `[build] \`prisma migrate deploy\` failed (attempt ${attempt}/${MAX_ATTEMPTS}) - retrying in ${RETRY_DELAY_MS / 1000}s in case the database was just waking up...`
    );
    sleepSync(RETRY_DELAY_MS);
  }
}

if (result.error) {
  console.error("[build] Failed to run `prisma migrate deploy`:", result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
