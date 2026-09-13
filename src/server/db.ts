import "server-only";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Central Prisma Client singleton - the one and only place the app opens a
 * database connection. Every service (Owner Center and admin alike) imports
 * `prisma` from here rather than instantiating its own client, so there is
 * exactly one connection pool and one place a later datasource swap (e.g.
 * SQLite -> Postgres, by swapping the adapter below) would happen.
 *
 * Same file path as prisma7.config.ts's `datasource.url` - see the comment
 * there for why it is a hardcoded relative path rather than an env var.
 */
const adapter = new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" });

/**
 * Cached on `globalThis` in development so Next.js's hot-reload (which
 * re-evaluates this module on every edit) does not open a fresh SQLite
 * connection on every save - in production a module is only evaluated once
 * per process anyway, so the cache is a no-op there.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
