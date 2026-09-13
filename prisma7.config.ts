import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * A real Postgres connection string - a genuine secret, unlike the old
 * local-file SQLite path this used to hold. Read from process.env only:
 * locally from a gitignored .env (never committed, loaded here via
 * `dotenv/config` since the Prisma CLI/tsx scripts don't auto-load it the
 * way Next.js does for the app itself); in Vercel from the project's
 * Environment Variables settings. See .env.example.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
