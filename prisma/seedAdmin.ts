import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/server/passwordCore";

/**
 * The ONLY way an admin account is ever created. There is no public admin
 * registration anywhere in the app - see src/app/admin/login/actions.ts,
 * which only ever authenticates against an existing `role: "admin"` User,
 * never creates one.
 *
 * Idempotent and safe to re-run: if an admin already exists, this does
 * nothing and exits successfully. That is the guard against accidentally
 * re-bootstrapping (and silently overwriting) production credentials by
 * running this command a second time - deliberately, it can ONLY ever
 * create the very first admin, never reset an existing one. Rotating an
 * existing admin's password, or creating a second admin, is intentionally
 * a job for an already-logged-in admin (not built in this step) - not for
 * this bootstrap script.
 *
 * Reads INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD from the real process
 * environment (export them in your shell, a gitignored local .env for
 * dev - loaded above via `dotenv/config` - CI secret, or hosting
 * platform's env var settings; see .env.example). Never a committed file,
 * and no fallback default credentials: with no admin yet and these unset,
 * it refuses to run rather than silently doing nothing insecure.
 *
 * Usage:
 *   INITIAL_ADMIN_EMAIL=admin@example.com INITIAL_ADMIN_PASSWORD=... npm run seed:admin
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existingAdminCount = await prisma.user.count({ where: { role: "admin" } });
  if (existingAdminCount > 0) {
    console.log(`An admin account already exists (${existingAdminCount} total) - nothing to do.`);
    console.log("This script only ever creates the very first admin; it never resets credentials.");
    return;
  }

  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error("No admin account exists yet, and INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD are not set.");
    console.error("Set both environment variables and re-run: npm run seed:admin");
    process.exitCode = 1;
    return;
  }

  if (password.length < 8) {
    console.error("INITIAL_ADMIN_PASSWORD must be at least 8 characters.");
    process.exitCode = 1;
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      role: "admin",
      name: "UNIQUE PLACES Team",
    },
  });

  console.log(`Initial admin account created: ${email}`);
  console.log("Further admin accounts must be created by an already-logged-in admin - there is no public admin registration.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
