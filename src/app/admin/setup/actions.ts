"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { createSession } from "@/server/session";
import { createInitialAdminFromInput } from "@/server/adminBootstrapCore";

export interface SetupResult {
  ok: boolean;
  message: string;
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * The one-time, unauthenticated admin setup form's Server Action. Re-checks
 * server-side (via createInitialAdminFromInput -> adminAccountExists) that
 * no admin exists yet immediately before creating one - the page-level
 * check in page.tsx is not the actual security boundary, this is: even a
 * direct POST to this action after the page itself would have redirected
 * away does nothing once an admin exists. On success, logs the new admin
 * in immediately (creates a real session) and redirects to /admin.
 */
export async function setupAdminAction(formData: FormData): Promise<SetupResult> {
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const confirmPassword = readString(formData, "confirmPassword");

  if (!email || !password || !confirmPassword) {
    return { ok: false, message: "Bitte alle Felder ausfüllen." };
  }
  if (password !== confirmPassword) {
    return { ok: false, message: "Die Passwörter stimmen nicht überein." };
  }

  const result = await createInitialAdminFromInput(prisma, { email, password });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    // Should not happen - createInitialAdminFromInput just created this row.
    return { ok: false, message: "Admin wurde angelegt, Anmeldung ist aber fehlgeschlagen. Bitte über /admin/login anmelden." };
  }

  await createSession(user.id);
  redirect("/admin");
}
