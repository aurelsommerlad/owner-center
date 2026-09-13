"use server";

import { redirect } from "next/navigation";
import { destroySession } from "@/server/session";

/** Shared by both the Owner Center and Admin sidebars/mobile navs. */
export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
