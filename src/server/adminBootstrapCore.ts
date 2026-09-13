/**
 * The ONLY logic anywhere that creates an admin account. There is no public
 * admin registration - see src/app/admin/login/actions.ts, which only ever
 * authenticates against an existing `role: "admin"` User, never creates one.
 *
 * Deliberately NOT guarded by `server-only`: this module is shared between
 * two callers that run in different contexts -
 *   - the Next.js app itself, via the token-gated GET /api/admin/bootstrap
 *     route (src/app/api/admin/bootstrap/route.ts) - for triggering the
 *     bootstrap from a browser, no terminal needed;
 *   - the standalone `npm run seed:admin` CLI script (prisma/seedAdmin.ts),
 *     which runs outside Next's server runtime, where `server-only` would
 *     throw.
 * Both pass in their own PrismaClient instance rather than importing the
 * app's singleton from src/server/db.ts, for the same reason.
 *
 * Idempotent and safe to call repeatedly: if an admin already exists, it
 * does nothing and reports that - so once the very first admin is created
 * (via whichever path), neither path can ever create a second one. Rotating
 * an existing admin's password, or creating additional admins, is
 * intentionally a job for an already-logged-in admin (not built in this
 * step), never for this bootstrap.
 */
import type { PrismaClient } from "@/generated/prisma/client";
import { hashPassword } from "./passwordCore";

export interface BootstrapAdminResult {
  ok: boolean;
  status: "created" | "already_exists" | "misconfigured";
  message: string;
}

export async function bootstrapInitialAdmin(prisma: PrismaClient): Promise<BootstrapAdminResult> {
  const existingAdminCount = await prisma.user.count({ where: { role: "admin" } });
  if (existingAdminCount > 0) {
    return {
      ok: false,
      status: "already_exists",
      message: "Es existiert bereits ein Admin-Konto - der Bootstrap wurde bereits durchgeführt und legt nie ein zweites Mal einen Admin an.",
    };
  }

  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password) {
    return {
      ok: false,
      status: "misconfigured",
      message: "INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD sind nicht gesetzt.",
    };
  }
  if (password.length < 8) {
    return {
      ok: false,
      status: "misconfigured",
      message: "INITIAL_ADMIN_PASSWORD muss mindestens 8 Zeichen haben.",
    };
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      role: "admin",
      name: "UNIQUE PLACES Team",
    },
  });

  return { ok: true, status: "created", message: `Admin-Konto ${email} wurde angelegt.` };
}
