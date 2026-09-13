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
 * the *direct* (non-pooled) connection instead.
 *
 * Deriving that direct connection by editing DATABASE_URL's hostname
 * (stripping "-pooler") did NOT fix it in production - same P1002, so
 * either that guess produced the wrong host for this project, or Vercel's
 * Neon integration already provisions the real thing under its own name.
 * It does: the integration sets PGHOST_UNPOOLED (confirmed present in this
 * project's Vercel env vars) alongside DATABASE_URL_UNPOOLED /
 * POSTGRES_URL_NON_POOLING, so those are used directly when present -
 * ahead of the hostname-editing guess, which stays only as a last-resort
 * fallback for setups that don't provide any of them. An explicit
 * DIRECT_URL, if one is ever set, wins over all of it.
 *
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

function directConnectionUrl(databaseUrl, env) {
  if (env.DIRECT_URL) return { url: env.DIRECT_URL, source: "DIRECT_URL" };
  if (env.DATABASE_URL_UNPOOLED) return { url: env.DATABASE_URL_UNPOOLED, source: "DATABASE_URL_UNPOOLED" };
  if (env.POSTGRES_URL_NON_POOLING) return { url: env.POSTGRES_URL_NON_POOLING, source: "POSTGRES_URL_NON_POOLING" };

  // Vercel's Neon integration also exposes the unpooled connection as
  // separate PG*-style parts rather than one URL - build one from those if
  // we have everything needed for it.
  const host = env.PGHOST_UNPOOLED;
  const user = env.PGUSER ?? env.POSTGRES_USER;
  const password = env.PGPASSWORD ?? env.POSTGRES_PASSWORD;
  const database = env.PGDATABASE ?? env.POSTGRES_DATABASE;
  if (host && user && password && database) {
    const url = new URL(databaseUrl);
    const builtUrl = new URL(`postgresql://${host}${url.port ? `:${url.port}` : ""}/${database}`);
    builtUrl.username = encodeURIComponent(user);
    builtUrl.password = encodeURIComponent(password);
    builtUrl.search = url.search;
    return { url: builtUrl.toString(), source: "PGHOST_UNPOOLED + PG*" };
  }

  try {
    const url = new URL(databaseUrl);
    if (!url.hostname.includes("-pooler.")) return { url: databaseUrl, source: null };
    url.hostname = url.hostname.replace("-pooler.", ".");
    return { url: url.toString(), source: "DATABASE_URL with \"-pooler\" stripped (fallback guess)" };
  } catch {
    return { url: databaseUrl, source: null };
  }
}

const { url: directUrl, source: directUrlSource } = directConnectionUrl(process.env.DATABASE_URL, process.env);
const migrateEnv = { ...process.env, DATABASE_URL: directUrl };
if (directUrlSource) {
  console.log(`[build] Using the non-pooled connection (from ${directUrlSource}) for \`prisma migrate deploy\` - advisory locks need a direct connection.`);
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
