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
 * Verifies credentials against the User table and, on success, creates a
 * real DB-backed session and redirects by role (admin -> /admin, owner ->
 * the existing Owner Center start page). An owner-role login additionally
 * requires both the OwnerUser and its Owner to still be "active" - admin
 * deactivating either blocks sign-in immediately, without touching the
 * password itself.
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

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, message: "E-Mail oder Passwort ist falsch." };
  }

  if (user.role === "owner") {
    const ownerUser = user.ownerUser;
    if (!ownerUser || ownerUser.status !== "active" || ownerUser.owner.status !== "active") {
      return { ok: false, message: "Dieses Konto ist deaktiviert. Bitte wenden Sie sich an UNIQUE PLACES." };
    }
  }

  await createSession(user.id);

  if (user.role === "owner" && user.ownerUser) {
    await prisma.ownerUser.update({
      where: { id: user.ownerUser.id },
      data: { lastLoginAt: new Date() },
    });
  }

  redirect(user.role === "admin" ? "/admin" : "/");
}
