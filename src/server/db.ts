import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Central Prisma Client singleton - the one and only place the app opens a
 * database connection. Every service (Owner Center and admin alike) imports
 * `prisma` from here rather than instantiating its own client, so there is
 * exactly one connection pool and one place a later datasource swap would
 * happen.
 *
 * `DATABASE_URL` is read by Next.js's own built-in .env loading (no extra
 * package needed here) - locally from a gitignored .env, in Vercel from the
 * project's Environment Variables. See .env.example.
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

/**
 * Cached on `globalThis` in development so Next.js's hot-reload (which
 * re-evaluates this module on every edit) does not open a fresh connection
 * pool on every save - in production a module is only evaluated once per
 * process anyway, so the cache is a no-op there.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
