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
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[build] DATABASE_URL not set - skipping `prisma migrate deploy` (fine without a database configured).");
  process.exit(0);
}

console.log("[build] DATABASE_URL is set - running `prisma migrate deploy`...");
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error("[build] Failed to run `prisma migrate deploy`:", result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
