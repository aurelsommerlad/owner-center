"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/session";
import { requireEffectiveOwnerContext } from "@/server/ownerContext";
import {
  inviteAccountingAccess,
  recreateAccountingInvitation,
  setAccountingAccessStatus,
  updateAccountingAccessProperties,
} from "@/services/statementAccountingAccessService";
import { getOwnerLocale } from "@/server/locale";
import { getDictionary, createTranslator } from "@/i18n";
import { getAppUrl } from "@/lib/appUrl";

/**
 * Server Actions for the Abrechnungen page's "Zugang für Buchhaltung"
 * section. Every action resolves the acting owner from the current session
 * itself (requireEffectiveOwnerContext()) - never from an id in
 * `formData` - and, just as importantly, REJECTS a restricted "accounting"
 * caller before it ever reaches statementAccountingAccessService.ts: an
 * accounting login must never be able to invite, edit, or revoke another
 * accounting grant (or its own) by calling these actions directly, even
 * though the UI that would normally trigger them is never rendered for
 * that role (see components/statements/AccountingAccessSection.tsx, only
 * mounted for ownerUserRole === "owner"). This file is the actual
 * enforcement, not the UI.
 */

export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface AccountingInviteActionResult extends ActionResult {
  inviteToken?: string;
  inviteUrl?: string;
  inviteExpiresAt?: string;
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function requireOwnerRoleContext(): Promise<
  { context: Awaited<ReturnType<typeof requireEffectiveOwnerContext>>; rejected: false } | { context: null; rejected: true }
> {
  const context = await requireEffectiveOwnerContext();
  if (context.ownerUserRole !== "owner") {
    return { context: null, rejected: true };
  }
  return { context, rejected: false };
}

export async function inviteAccountingAccessAction(
  propertyId: string,
  formData: FormData
): Promise<AccountingInviteActionResult> {
  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));
  const { context, rejected } = await requireOwnerRoleContext();
  if (rejected || !context) return { ok: false, message: t("profile.actionNotAllowed") };

  const session = await getSession();
  if (!session) return { ok: false, message: t("profile.pleaseSignInAgain") };

  const email = readString(formData, "email");
  const name = readString(formData, "name");
  const allProperties = formData.get("scope") === "all";
  const propertyIds = allProperties ? [] : formData.getAll("propertyIds").map(String);
  if (!email) return { ok: false, message: t("profile.fillAllFields") };

  let inviteToken: string;
  let inviteExpiresAt: string;
  try {
    ({ inviteToken, inviteExpiresAt } = await inviteAccountingAccess(
      context.ownerId,
      session.userId,
      { email, name, allProperties, propertyIds },
      locale
    ));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : t("profile.userCreationFailed") };
  }

  revalidatePath(`/${propertyId}/abrechnungen`);
  return {
    ok: true,
    message: t("accountingAccess.invited", { name: name || email }),
    inviteToken,
    inviteUrl: `${await getAppUrl()}/invite/${inviteToken}`,
    inviteExpiresAt,
  };
}

export async function recreateAccountingInvitationAction(
  propertyId: string,
  ownerUserId: string
): Promise<AccountingInviteActionResult> {
  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));
  const { context, rejected } = await requireOwnerRoleContext();
  if (rejected || !context) return { ok: false, message: t("profile.actionNotAllowed") };

  const session = await getSession();
  if (!session) return { ok: false, message: t("profile.pleaseSignInAgain") };

  let inviteToken: string;
  let inviteExpiresAt: string;
  try {
    ({ inviteToken, inviteExpiresAt } = await recreateAccountingInvitation(
      context.ownerId,
      ownerUserId,
      session.userId,
      locale
    ));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : t("profile.invitationCreationFailed") };
  }

  revalidatePath(`/${propertyId}/abrechnungen`);
  return {
    ok: true,
    message: t("profile.newInvitationCreated"),
    inviteToken,
    inviteUrl: `${await getAppUrl()}/invite/${inviteToken}`,
    inviteExpiresAt,
  };
}

export async function setAccountingAccessStatusAction(
  propertyId: string,
  ownerUserId: string,
  status: "active" | "inactive"
): Promise<ActionResult> {
  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));
  const { context, rejected } = await requireOwnerRoleContext();
  if (rejected || !context) return { ok: false, message: t("profile.actionNotAllowed") };

  try {
    const { name } = await setAccountingAccessStatus(context.ownerId, ownerUserId, status, locale);
    revalidatePath(`/${propertyId}/abrechnungen`);
    return {
      ok: true,
      message: t(status === "active" ? "profile.userActivated" : "profile.userDeactivated", { name }),
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : t("profile.statusChangeFailed") };
  }
}

export async function updateAccountingAccessPropertiesAction(
  propertyId: string,
  ownerUserId: string,
  formData: FormData
): Promise<ActionResult> {
  const locale = await getOwnerLocale();
  const t = createTranslator(getDictionary(locale));
  const { context, rejected } = await requireOwnerRoleContext();
  if (rejected || !context) return { ok: false, message: t("profile.actionNotAllowed") };

  const allProperties = formData.get("scope") === "all";
  const propertyIds = allProperties ? [] : formData.getAll("propertyIds").map(String);

  try {
    await updateAccountingAccessProperties(context.ownerId, ownerUserId, { allProperties, propertyIds }, locale);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : t("accountingAccess.updateFailed") };
  }

  revalidatePath(`/${propertyId}/abrechnungen`);
  return { ok: true, message: t("accountingAccess.updated") };
}
