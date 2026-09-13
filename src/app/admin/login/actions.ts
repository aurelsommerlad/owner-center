"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { verifyPassword } from "@/server/password";
import { createSession } from "@/server/session";

export interface LoginResult {
  ok: boolean;
  message: string;
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * The dedicated admin login flow, deliberately separate from
 * src/app/login/actions.ts#loginAction: this action only ever creates a
 * session for a `role: "admin"` User. A correct owner password entered here
 * is rejected with the same generic message as a wrong password - an owner
 * can never reach /admin by authenticating through this form, regardless of
 * how correct their credentials are. There is no public admin
 * registration; the only way an admin account is created is the
 * `npm run seed:admin` bootstrap (see prisma/seedAdmin.ts) or another
 * already-logged-in admin (not built yet - out of scope for this step).
 */
export async function adminLoginAction(formData: FormData): Promise<LoginResult> {
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");

  if (!email || !password) {
    return { ok: false, message: "Bitte E-Mail und Passwort eingeben." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = user ? verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordOk || user.role !== "admin") {
    return { ok: false, message: "E-Mail oder Passwort ist falsch." };
  }

  await createSession(user.id);
  redirect("/admin");
}
