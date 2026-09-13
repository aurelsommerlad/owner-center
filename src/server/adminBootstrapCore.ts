/**
 * The ONLY logic anywhere that creates an admin account. There is no public
 * admin registration in the ongoing sense - see src/app/admin/login/actions.ts,
 * which only ever authenticates against an existing `role: "admin"` User,
 * never creates one. Exactly one unauthenticated path can ever create an
 * admin, and only once: the first-run setup page at /admin/setup
 * (src/app/admin/setup/actions.ts). An optional terminal/CI alternative,
 * `npm run seed:admin` (prisma/seedAdmin.ts), exists for deployments that
 * prefer to provision the first admin without ever exposing the setup page
 * at all - both share the exact same guarantee below.
 *
 * Deliberately NOT guarded by `server-only`: this module runs in two
 * different contexts - the Next.js app itself (setup page/action, admin
 * layout's existence check), and the standalone `npm run seed:admin` CLI
 * script, which runs outside Next's server runtime where `server-only`
 * would throw. Every caller passes in its own PrismaClient instance rather
 * than importing the app's singleton from src/server/db.ts, for the same
 * reason.
 *
 * Idempotent and safe to call repeatedly: once any admin exists, every path
 * here refuses to create another one - checked both with an upfront query
 * (fast path, good error messages) and by catching the database's own
 * unique-email violation as a fallback if two setup attempts somehow race
 * each other. Rotating an existing admin's password, or creating
 * additional admins, is intentionally a job for an already-logged-in admin
 * (not built in this step), never for any of these paths.
 */
import type { PrismaClient } from "@/generated/prisma/client";
import { hashPassword } from "./passwordCore";

export interface BootstrapAdminResult {
  ok: boolean;
  status: "created" | "already_exists" | "invalid_input" | "misconfigured";
  message: string;
}

const ALREADY_EXISTS_RESULT: BootstrapAdminResult = {
  ok: false,
  status: "already_exists",
  message: "Es existiert bereits ein Admin-Konto - die Erstanlage ist damit dauerhaft nicht mehr möglich.",
};

/** True once any admin exists - the sole, permanent gate for every unauthenticated admin-creation path. */
export async function adminAccountExists(prisma: PrismaClient): Promise<boolean> {
  const count = await prisma.user.count({ where: { role: "admin" } });
  return count > 0;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

async function createAdminUser(prisma: PrismaClient, email: string, password: string): Promise<BootstrapAdminResult> {
  try {
    await prisma.user.create({
      data: { email, passwordHash: hashPassword(password), role: "admin", name: "UNIQUE PLACES Team" },
    });
  } catch (error) {
    // Someone else's request (a second browser tab on the setup page, most
    // realistically) won a race and created the email/admin first.
    if (isUniqueConstraintError(error)) return ALREADY_EXISTS_RESULT;
    throw error;
  }
  return { ok: true, status: "created", message: `Admin-Konto ${email} wurde angelegt.` };
}

/** Used by the web setup form (src/app/admin/setup/actions.ts) - email/password come from user input. */
export async function createInitialAdminFromInput(
  prisma: PrismaClient,
  input: { email: string; password: string }
): Promise<BootstrapAdminResult> {
  if (await adminAccountExists(prisma)) return ALREADY_EXISTS_RESULT;

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, status: "invalid_input", message: "Bitte eine gültige E-Mail-Adresse angeben." };
  }
  if (!input.password || input.password.length < 8) {
    return { ok: false, status: "invalid_input", message: "Das Passwort muss mindestens 8 Zeichen haben." };
  }

  return createAdminUser(prisma, email, input.password);
}

/** Used by the optional `npm run seed:admin` CLI script - email/password come from process.env. */
export async function bootstrapInitialAdminFromEnv(prisma: PrismaClient): Promise<BootstrapAdminResult> {
  if (await adminAccountExists(prisma)) return ALREADY_EXISTS_RESULT;

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
    return { ok: false, status: "misconfigured", message: "INITIAL_ADMIN_PASSWORD muss mindestens 8 Zeichen haben." };
  }

  return createAdminUser(prisma, email, password);
}
