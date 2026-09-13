import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { bootstrapInitialAdminFromEnv } from "../src/server/adminBootstrapCore";

/**
 * Optional terminal/CI entry point for the shared bootstrap logic in
 * src/server/adminBootstrapCore.ts. The primary, recommended way to create
 * the first admin is the web-based first-run setup at /admin/setup (see
 * src/app/admin/setup/) - visiting /admin with no admin account yet lands
 * there automatically, no terminal or environment variables needed. This
 * script is only useful for deployments that prefer to provision the first
 * admin via CI/automation instead of ever exposing that page.
 *
 * Usage:
 *   INITIAL_ADMIN_EMAIL=admin@example.com INITIAL_ADMIN_PASSWORD=... npm run seed:admin
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await bootstrapInitialAdminFromEnv(prisma);
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
