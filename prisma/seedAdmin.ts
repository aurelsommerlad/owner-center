import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { bootstrapInitialAdmin } from "../src/server/adminBootstrapCore";

/**
 * CLI entry point for the shared bootstrap logic in
 * src/server/adminBootstrapCore.ts - see that file for the actual rules
 * (idempotent, env-var-only credentials, no public registration). This is
 * the path for anyone who DOES have local/CI terminal access to the
 * database; GET /api/admin/bootstrap (src/app/api/admin/bootstrap/route.ts)
 * is the equivalent path for triggering it from a browser instead, e.g. on
 * a host like Vercel where a local terminal never touches the production
 * database at all.
 *
 * Usage:
 *   INITIAL_ADMIN_EMAIL=admin@example.com INITIAL_ADMIN_PASSWORD=... npm run seed:admin
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await bootstrapInitialAdmin(prisma);
  console.log(result.message);
  if (result.status === "misconfigured") {
    console.error("Set both environment variables and re-run: npm run seed:admin");
    process.exitCode = 1;
  } else if (result.status === "created") {
    console.log("Further admin accounts must be created by an already-logged-in admin - there is no public admin registration.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
