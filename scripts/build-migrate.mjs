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
 * Retries on failure: transient connectivity hiccups shouldn't take down an
 * otherwise-healthy build. A genuinely broken/unreachable database still
 * fails the build after these attempts, it just isn't taken down by one
 * flaky connection.
 *
 * Migrates over a non-pooled connection: a real production failure
 * (P1002, "timed out trying to acquire a postgres advisory lock") kept
 * happening identically on every retry - each attempt connected and read
 * `3 migrations found` within ~1s, then hung for the full 10s timeout on
 * `SELECT pg_advisory_lock(...)`. That rules out a slow-to-wake database
 * (which a retry fixes); it's the signature of Neon's pooled connection
 * (PgBouncer in transaction mode), which doesn't preserve the session state
 * `pg_advisory_lock` needs - the documented fix is to run migrations over
 * the *direct* (non-pooled) connection instead. Neon's direct endpoint is
 * the same connection string with "-pooler" removed from the hostname, so
 * that's derived here rather than requiring a separate DIRECT_URL env var
 * on Vercel (an explicit DIRECT_URL, if one is ever set, still wins).
 * Prisma 7's defineConfig() datasource (prisma7.config.ts) has no
 * `directUrl` field to put this in the schema instead, so it's applied by
 * overriding DATABASE_URL for just this subprocess - the Next.js app
 * itself keeps using the original, pooled DATABASE_URL, which is what you
 * want for normal request traffic.
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[build] DATABASE_URL not set - skipping `prisma migrate deploy` (fine without a database configured).");
  process.exit(0);
}

function directConnectionUrl(databaseUrl) {
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;
  try {
    const url = new URL(databaseUrl);
    if (!url.hostname.includes("-pooler.")) return databaseUrl;
    url.hostname = url.hostname.replace("-pooler.", ".");
    return url.toString();
  } catch {
    return databaseUrl;
  }
}

const migrateEnv = { ...process.env, DATABASE_URL: directConnectionUrl(process.env.DATABASE_URL) };
if (migrateEnv.DATABASE_URL !== process.env.DATABASE_URL) {
  console.log("[build] Using the non-pooled connection for `prisma migrate deploy` (advisory locks need a direct connection).");
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
    env: migrateEnv,
  });

  if (!result.error && result.status === 0) break;

  if (attempt < MAX_ATTEMPTS) {
    console.warn(
      `[build] \`prisma migrate deploy\` failed (attempt ${attempt}/${MAX_ATTEMPTS}) - retrying in ${RETRY_DELAY_MS / 1000}s...`
    );
    sleepSync(RETRY_DELAY_MS);
  }
}

if (result.error) {
  console.error("[build] Failed to run `prisma migrate deploy`:", result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
