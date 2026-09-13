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
 * The Owner Center login, deliberately separate from
 * src/app/admin/login/actions.ts#adminLoginAction: this action only ever
 * creates a session for a `role: "owner"` User with an active OwnerUser +
 * Owner. A correct admin password entered here is rejected with the same
 * generic message as a wrong password - an admin account can never reach
 * the Owner Center's session state through this form, regardless of how
 * correct its credentials are.
 */
export async function loginAction(formData: FormData): Promise<LoginResult> {
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");

  if (!email || !password) {
    return { ok: false, message: "Bitte E-Mail und Passwort eingeben." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { ownerUser: { include: { owner: true } } },
  });
  const passwordOk = user ? verifyPassword(password, user.passwordHash) : false;

  if (!user || !passwordOk || user.role !== "owner") {
    return { ok: false, message: "E-Mail oder Passwort ist falsch." };
  }

  const ownerUser = user.ownerUser;
  if (!ownerUser || ownerUser.status !== "active" || ownerUser.owner.status !== "active") {
    return { ok: false, message: "Dieses Konto ist deaktiviert. Bitte wenden Sie sich an UNIQUE PLACES." };
  }

  await createSession(user.id);
  await prisma.ownerUser.update({
    where: { id: ownerUser.id },
    data: { lastLoginAt: new Date() },
  });

  redirect("/");
}
