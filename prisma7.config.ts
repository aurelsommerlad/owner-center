import { defineConfig } from "prisma/config";

/**
 * The SQLite file path is not a secret - it is a relative path on disk, not
 * a credential - so it is safely hardcoded here rather than routed through
 * an untracked .env file. This keeps `npm install && npm run build` working
 * on a fresh checkout with zero required setup. A later move to a real
 * server (e.g. Postgres) would read `url` from `process.env.DATABASE_URL`
 * instead, which is the one place a real connection secret would then live
 * - server-side only, never bundled into client code.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "file:./prisma/dev.db",
  },
});
