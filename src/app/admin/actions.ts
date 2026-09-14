"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AccountStatus, AdminAccountStatus } from "@/types/admin";
import { requireAdminRole } from "@/lib/adminAuth";
import { createOwner, deleteOwnerPermanently, getOwner, updateOwner } from "@/services/admin/ownerService";
import {
  createOwnerUser,
  deleteOwnerUserPermanently,
  recreateOwnerUserInvitation,
  updateOwnerUser,
} from "@/services/admin/ownerUserService";
import { createProperty, getProperty, updateProperty } from "@/services/admin/propertyService";
import {
  createAdminAccount,
  deleteAdminAccountPermanently,
  recreateAdminInvitation,
  setAdminAccountStatus,
} from "@/services/admin/adminUserService";
import { grantAccess, revokeAccess, setOwnerPropertyAccess, setPropertyOwnerAccess } from "@/services/admin/accessService";
import { testApaleoConnection, type ApaleoConnectionStatus } from "@/server/integrations/apaleo/connectionCheck";
import { getApaleoProperty } from "@/server/integrations/apaleo/propertyService";
import { getUnitsForProperty } from "@/server/integrations/apaleo/unitService";
import { describeApaleoError } from "@/server/integrations/apaleo/errors";
import { loadApaleoMappingOverview } from "@/server/integrations/apaleo/mappingStatus";
import { testGoogleDriveConnection, type GoogleDriveConnectionStatus } from "@/server/integrations/googleDrive/connectionCheck";
import { assertFolderIsDirectRootChild } from "@/server/integrations/googleDrive/folderService";
import { describeGoogleDriveError } from "@/server/integrations/googleDrive/errors";
import { syncGoogleDriveDocuments, type GoogleDriveSyncResult } from "@/server/integrations/googleDrive/documentSync";
import {
  archiveStatementDocument,
  publishStatementDocument,
  updateStatementDocumentFields,
  type StatementDocumentUpdateInput,
} from "@/services/admin/statementService";
import { prisma } from "@/server/db";

/**
 * Server Actions for the owner/user/property admin flows, backed by the
 * real database (via services/admin/*), followed by revalidatePath so the
 * affected Server Components re-render with the new data.
 *
 * Every exported action here calls requireAdminRole() FIRST, before doing
 * anything else. This is not redundant with the /admin/(protected) layout's
 * own requireAdminRole() call: Server Actions are independently invokable
 * POST endpoints in Next.js, not gated by which page rendered the button
 * that triggers them - an authenticated owner (or any caller who knows the
 * action reference) could otherwise call e.g. setOwnerStatusAction or
 * updateOwnerAccessAction directly, bypassing every admin page entirely.
 * The check here is what actually enforces "Owner darf keine Admin-API
 * verwenden", not the page-level gate.
 */

export interface ActionResult {
  ok: boolean;
  message: string;
}

/**
 * Result of any action that (re-)issues an owner-user invitation: `ok`
 * false means the invitation was never created (see `message`); `ok` true
 * always carries the raw token the admin's browser needs to build and copy
 * the link. This is the ONLY place the raw token is ever transmitted - it
 * never touches a log line, and the client component that receives this
 * builds the full URL itself from `window.location.origin` rather than the
 * server guessing its own public origin.
 */
export interface InvitationActionResult {
  ok: boolean;
  message: string;
  inviteToken?: string;
  inviteExpiresAt?: string;
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createOwnerAction(formData: FormData): Promise<InvitationActionResult> {
  const session = await requireAdminRole();

  const name = readString(formData, "name");
  const companyName = readString(formData, "companyName");
  const firstName = readString(formData, "firstName");
  const lastName = readString(formData, "lastName");
  const email = readString(formData, "email");

  if (!name) return { ok: false, message: "Bitte einen Namen für den Eigentümer angeben." };
  if (!firstName || !lastName || !email) {
    return { ok: false, message: "Bitte Vorname, Nachname und E-Mail des ersten Nutzers angeben." };
  }

  const propertyIds = formData.getAll("propertyIds").map(String);

  const owner = await createOwner({ name, companyName: companyName || undefined });
  let inviteToken: string;
  let inviteExpiresAt: string;
  try {
    ({ inviteToken, inviteExpiresAt } = await createOwnerUser(
      { ownerId: owner.id, firstName, lastName, email },
      session.userId
    ));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Nutzer konnte nicht angelegt werden." };
  }
  for (const propertyId of propertyIds) {
    await grantAccess(owner.id, propertyId);
  }

  revalidatePath("/admin/owners");
  revalidatePath("/admin/properties");
  revalidatePath("/admin");
  return { ok: true, message: `${name} wurde angelegt. Einladung erstellt.`, inviteToken, inviteExpiresAt };
}

/**
 * "Eigentümerdaten bearbeiten" - master-data only (name/companyName). Never
 * touches `status` (that stays behind the separate, confirmation-gated
 * deactivate/reactivate flow) and never touches User/OwnerUser data - Owner
 * and OwnerUser are deliberately kept technically separate, so editing an
 * owner's master data can never change who has login access or which
 * properties/users are assigned.
 */
export async function updateOwnerAction(ownerId: string, formData: FormData): Promise<ActionResult> {
  await requireAdminRole();

  const owner = await getOwner(ownerId);
  if (!owner) return { ok: false, message: "Eigentümer nicht gefunden." };

  const name = readString(formData, "name");
  const companyName = readString(formData, "companyName");
  if (!name) return { ok: false, message: "Bitte einen Namen für den Eigentümer angeben." };

  await updateOwner(ownerId, { name, companyName: companyName || undefined });

  revalidatePath("/admin/owners");
  revalidatePath(`/admin/owners/${ownerId}`);
  return { ok: true, message: `${name} wurde aktualisiert.` };
}

export async function setOwnerStatusAction(
  ownerId: string,
  status: AccountStatus,
  ownerName: string
): Promise<ActionResult> {
  await requireAdminRole();

  await updateOwner(ownerId, { status });
  revalidatePath("/admin/owners");
  revalidatePath(`/admin/owners/${ownerId}`);
  revalidatePath("/admin");
  return { ok: true, message: `${ownerName} wurde ${status === "active" ? "aktiviert" : "deaktiviert"}.` };
}

export async function createOwnerUserAction(formData: FormData): Promise<InvitationActionResult> {
  const session = await requireAdminRole();

  const ownerId = readString(formData, "ownerId");
  const firstName = readString(formData, "firstName");
  const lastName = readString(formData, "lastName");
  const email = readString(formData, "email");
  if (!ownerId || !firstName || !lastName || !email) {
    return { ok: false, message: "Bitte alle Felder ausfüllen." };
  }
  let inviteToken: string;
  let inviteExpiresAt: string;
  try {
    ({ inviteToken, inviteExpiresAt } = await createOwnerUser({ ownerId, firstName, lastName, email }, session.userId));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Nutzer konnte nicht angelegt werden." };
  }
  revalidatePath(`/admin/owners/${ownerId}`);
  return {
    ok: true,
    message: `${firstName} ${lastName} wurde hinzugefügt. Einladung erstellt.`,
    inviteToken,
    inviteExpiresAt,
  };
}

/**
 * "Einladung neu erstellen" - revokes any still-open invitation for this
 * owner user and issues a fresh one (see recreateOwnerUserInvitation), so a
 * lost/expired link or a mistakenly-deactivated invitee both have exactly
 * one recovery path. The old link stops working the moment this runs.
 */
export async function recreateOwnerInvitationAction(
  ownerUserId: string,
  ownerId: string
): Promise<InvitationActionResult> {
  const session = await requireAdminRole();

  let inviteToken: string;
  let inviteExpiresAt: string;
  try {
    ({ inviteToken, inviteExpiresAt } = await recreateOwnerUserInvitation(ownerUserId, session.userId));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Einladung konnte nicht erstellt werden." };
  }
  revalidatePath(`/admin/owners/${ownerId}`);
  return { ok: true, message: "Neue Einladung erstellt.", inviteToken, inviteExpiresAt };
}

export async function updateOwnerUserAction(
  userId: string,
  ownerId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireAdminRole();

  const firstName = readString(formData, "firstName");
  const lastName = readString(formData, "lastName");
  const email = readString(formData, "email");
  if (!firstName || !lastName || !email) return { ok: false, message: "Bitte alle Felder ausfüllen." };
  try {
    await updateOwnerUser(userId, { firstName, lastName, email });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Nutzer konnte nicht aktualisiert werden." };
  }
  revalidatePath(`/admin/owners/${ownerId}`);
  return { ok: true, message: `${firstName} ${lastName} wurde aktualisiert.` };
}

export async function setOwnerUserStatusAction(
  userId: string,
  ownerId: string,
  status: AccountStatus,
  userName: string
): Promise<ActionResult> {
  await requireAdminRole();

  try {
    await updateOwnerUser(userId, { status });
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Status konnte nicht geändert werden." };
  }
  revalidatePath(`/admin/owners/${ownerId}`);
  return { ok: true, message: `${userName} wurde ${status === "active" ? "aktiviert" : "deaktiviert"}.` };
}

/**
 * "Nutzer endgültig löschen" - see ownerUserService.ts#deleteOwnerUserPermanently
 * for the actual scoping/safety rules (user-level relations only, never
 * blocked by the owner's own properties/documents). `ownerId` here is only
 * used for revalidatePath - the real authorization is requireAdminRole()
 * plus the re-checks inside deleteOwnerUserPermanently itself.
 */
export async function deleteOwnerUserAction(ownerUserId: string, ownerId: string): Promise<ActionResult> {
  await requireAdminRole();

  const result = await deleteOwnerUserPermanently(ownerUserId);
  if (result.ok) {
    revalidatePath(`/admin/owners/${ownerId}`);
    revalidatePath("/admin/owners");
  }
  return result;
}

export async function updateOwnerAccessAction(ownerId: string, propertyIds: string[]): Promise<ActionResult> {
  await requireAdminRole();

  await setOwnerPropertyAccess(ownerId, propertyIds);
  revalidatePath(`/admin/owners/${ownerId}`);
  revalidatePath("/admin/owners");
  revalidatePath("/admin/properties");
  return { ok: true, message: "Objektzugriff wurde aktualisiert." };
}

export async function createPropertyAction(formData: FormData): Promise<ActionResult> {
  await requireAdminRole();

  const name = readString(formData, "name");
  const location = readString(formData, "location");
  if (!name || !location) return { ok: false, message: "Bitte Objektname und Standort angeben." };

  const statementsDriveFolderId = readString(formData, "statementsDriveFolderId");
  const documentsDriveFolderId = readString(formData, "documentsDriveFolderId");
  const ownerIds = formData.getAll("ownerIds").map(String);

  // apaleoPropertyId is deliberately not set here - it is only ever set via
  // setApaleoPropertyMappingAction (the dedicated "apaleo-Verknüpfung" card
  // on /admin/properties/[id]), which enforces the one-to-one uniqueness
  // rule this quick-create form has no way to check.
  const property = await createProperty({
    name,
    location,
    statementsDriveFolderId: statementsDriveFolderId || undefined,
    documentsDriveFolderId: documentsDriveFolderId || undefined,
  });
  for (const ownerId of ownerIds) {
    await grantAccess(ownerId, property.id);
  }

  revalidatePath("/admin/properties");
  revalidatePath("/admin/owners");
  revalidatePath("/admin");
  return { ok: true, message: `${name} wurde angelegt.` };
}

export async function updatePropertyAction(propertyId: string, formData: FormData): Promise<ActionResult> {
  await requireAdminRole();

  const name = readString(formData, "name");
  const location = readString(formData, "location");
  if (!name || !location) return { ok: false, message: "Bitte Objektname und Standort angeben." };

  const statementsDriveFolderId = readString(formData, "statementsDriveFolderId");
  const documentsDriveFolderId = readString(formData, "documentsDriveFolderId");
  const ownerIds = formData.getAll("ownerIds").map(String);

  // apaleoPropertyId is deliberately left untouched here - see
  // setApaleoPropertyMappingAction.
  await updateProperty(propertyId, {
    name,
    location,
    statementsDriveFolderId: statementsDriveFolderId || undefined,
    documentsDriveFolderId: documentsDriveFolderId || undefined,
  });
  await setPropertyOwnerAccess(propertyId, ownerIds);

  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/admin/owners");
  return { ok: true, message: `${name} wurde aktualisiert.` };
}

/**
 * Performs a real, live "Verbindung testen" call to apaleo (listing
 * properties) and persists the outcome, so the /admin/integrations card can
 * show a "letzter erfolgreicher Check" that survives across requests. Never
 * throws - failures come back as a normal (unsuccessful) result.
 */
export async function testApaleoConnectionAction(): Promise<ApaleoConnectionStatus["lastCheck"]> {
  await requireAdminRole();
  const result = await testApaleoConnection();
  revalidatePath("/admin/integrations");
  return result;
}

/**
 * Performs a real, live "Verbindung testen" call to Google Drive (loading
 * the configured root folder and counting its immediate children) and
 * persists the outcome, so the /admin/integrations card can show a "letzter
 * erfolgreicher Check" that survives across requests. Never throws -
 * failures come back as a normal (unsuccessful) result. Admin-only: Owner
 * Center code never imports this or the underlying connectionCheck module.
 */
export async function testGoogleDriveConnectionAction(): Promise<GoogleDriveConnectionStatus["lastCheck"]> {
  await requireAdminRole();
  const result = await testGoogleDriveConnection();
  revalidatePath("/admin/integrations");
  return result;
}

export interface ApaleoMappingCheckResult {
  ok: boolean;
  message: string;
  propertyName?: string;
  unitsCount?: number;
}

/**
 * Checks whether a Property's `apaleoPropertyId` resolves to a real apaleo
 * property - on success returns its name (and, best-effort, its unit
 * count); on failure a clear reason (not found / not configured / apaleo
 * unreachable / ...). Deliberately does NOT change or auto-guess the id -
 * mapping stays explicit, entered only via the property edit form.
 */
export async function checkApaleoMappingAction(propertyId: string): Promise<ApaleoMappingCheckResult> {
  await requireAdminRole();

  const property = await getProperty(propertyId);
  if (!property) return { ok: false, message: "Objekt nicht gefunden." };
  if (!property.apaleoPropertyId) {
    return { ok: false, message: "Keine apaleo Property-ID hinterlegt." };
  }

  try {
    const apaleoProperty = await getApaleoProperty(property.apaleoPropertyId);
    if (!apaleoProperty) {
      return { ok: false, message: `Property-ID "${property.apaleoPropertyId}" wurde in apaleo nicht gefunden.` };
    }
    const unitsCount = await getUnitsForProperty(property.apaleoPropertyId)
      .then((units) => units.length)
      .catch(() => undefined);
    return { ok: true, message: "Mapping gültig.", propertyName: apaleoProperty.name, unitsCount };
  } catch (err) {
    return { ok: false, message: describeApaleoError(err) };
  }
}

/**
 * "Als Owner ansehen": starts a secure admin preview of the Owner Center as
 * `ownerId`, WITHOUT logging the admin out of their own account or logging
 * them into any OwnerUser - the admin's own Session row (and its cookie)
 * stays exactly as it was. What changes is a separate AdminImpersonation
 * row, keyed to that same sessionId, which src/server/ownerContext.ts#
 * getEffectiveOwnerContext reads on every subsequent Owner Center request
 * to resolve "which owner's data may this request see". requireAdminRole()
 * is the actual security boundary here (same as every other action in this
 * file): a non-admin caller - including a plain owner trying to invoke this
 * action reference directly - is redirected/404'd before anything else
 * runs, so an owner can never start a preview or pick an arbitrary ownerId
 * via a manipulated request.
 */
export async function startImpersonationAction(ownerId: string): Promise<void> {
  const admin = await requireAdminRole();

  const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
  if (!owner) notFound();

  // Defensive: never leave more than one active preview row per session -
  // if the admin was already previewing someone else, close that one out.
  await prisma.adminImpersonation.updateMany({
    where: { sessionId: admin.sessionId, endedAt: null },
    data: { endedAt: new Date() },
  });
  await prisma.adminImpersonation.create({
    data: { sessionId: admin.sessionId, adminUserId: admin.userId, ownerId },
  });

  redirect("/");
}

/**
 * Ends the current admin's active "Als Owner ansehen" preview (if any) and
 * returns to the Owner's admin detail page - the admin was never logged
 * out, so no re-login is needed. Also requireAdminRole()-gated, though in
 * practice only an admin session can ever have an active preview to end.
 */
export async function endImpersonationAction(): Promise<void> {
  const admin = await requireAdminRole();

  const active = await prisma.adminImpersonation.findFirst({
    where: { sessionId: admin.sessionId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });

  if (active) {
    await prisma.adminImpersonation.update({
      where: { id: active.id },
      data: { endedAt: new Date() },
    });
  }

  redirect(active ? `/admin/owners/${active.ownerId}` : "/admin/owners");
}

/**
 * "Verknüpfung speichern": sets (or clears, for an empty id) a Property's
 * apaleoPropertyId. The internal Property table stays the leading mapping -
 * this never derives or auto-guesses an id, it only persists whatever the
 * admin picked from the (live-apaleo-backed) dropdown on
 * /admin/properties/[id]. Server-side enforces the one rule that matters:
 * the same apaleo property can never be attached to two internal
 * properties at once.
 */
export async function setApaleoPropertyMappingAction(
  propertyId: string,
  apaleoPropertyId: string
): Promise<ActionResult> {
  await requireAdminRole();

  const property = await getProperty(propertyId);
  if (!property) return { ok: false, message: "Objekt nicht gefunden." };

  const trimmed = apaleoPropertyId.trim();
  if (trimmed) {
    const conflict = await prisma.property.findFirst({
      where: { apaleoPropertyId: trimmed, id: { not: propertyId } },
    });
    if (conflict) {
      return { ok: false, message: "Dieses apaleo-Objekt ist bereits einem anderen internen Objekt zugeordnet." };
    }

    // Best-effort: if apaleo is reachable right now, confirm the id is real.
    // If apaleo is unreachable, we simply can't check yet - "Mapping prüfen"
    // (and the badge on this page) will still catch a bad id afterward.
    const overview = await loadApaleoMappingOverview();
    if (overview.available && !overview.byId.has(trimmed)) {
      return { ok: false, message: "apaleo Property konnte nicht gefunden werden." };
    }
  }

  await updateProperty(propertyId, { apaleoPropertyId: trimmed });

  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/integrations");
  return { ok: true, message: trimmed ? "Verknüpfung wurde gespeichert." : "Verknüpfung wurde entfernt." };
}

/**
 * "Google Drive" card's "Zuordnung speichern" on /admin/properties/[id] -
 * the ONLY place Property.googleDriveFolderId is ever written. Mirrors
 * setApaleoPropertyMappingAction's shape (uniqueness check, then save), but
 * adds the one check that mapping doesn't need: re-verifying the submitted
 * id against LIVE Drive metadata via assertFolderIsDirectRootChild, so a
 * manipulated request (e.g. calling this action directly with an id that
 * never appeared in the admin's own dropdown) can never connect a Property
 * to a folder outside the configured root - the id from the dropdown is
 * never trusted on its own, no matter how it reached this action.
 */
export async function setGoogleDriveFolderMappingAction(
  propertyId: string,
  googleDriveFolderId: string
): Promise<ActionResult> {
  await requireAdminRole();

  const property = await getProperty(propertyId);
  if (!property) return { ok: false, message: "Objekt nicht gefunden." };

  const trimmed = googleDriveFolderId.trim();
  if (trimmed) {
    const conflict = await prisma.property.findFirst({
      where: { googleDriveFolderId: trimmed, id: { not: propertyId } },
    });
    if (conflict) {
      return { ok: false, message: "Dieser Google-Drive-Ordner ist bereits einem anderen internen Objekt zugeordnet." };
    }

    let folder;
    try {
      folder = await assertFolderIsDirectRootChild(trimmed);
    } catch (err) {
      return { ok: false, message: describeGoogleDriveError(err) };
    }
    if (!folder) {
      return {
        ok: false,
        message: "Dieser Ordner liegt nicht direkt im konfigurierten Google-Drive-Root-Ordner oder wurde nicht gefunden.",
      };
    }
  }

  await updateProperty(propertyId, { googleDriveFolderId: trimmed });

  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${propertyId}`);
  return { ok: true, message: trimmed ? "Zuordnung wurde gespeichert." : "Zuordnung wurde entfernt." };
}

/**
 * Grants one owner access to one property - the property-detail-page
 * counterpart to updateOwnerAccessAction (the owner-detail page's bulk
 * editor). Both ultimately go through services/admin/accessService.ts
 * against the same OwnerPropertyAccess table, so neither UI can drift out
 * of sync with the other.
 */
export async function assignOwnerToPropertyAction(propertyId: string, ownerId: string): Promise<ActionResult> {
  await requireAdminRole();

  const [property, owner] = await Promise.all([getProperty(propertyId), getOwner(ownerId)]);
  if (!property) return { ok: false, message: "Objekt nicht gefunden." };
  if (!owner) return { ok: false, message: "Eigentümer nicht gefunden." };

  const existing = await prisma.ownerPropertyAccess.findUnique({
    where: { ownerId_propertyId: { ownerId, propertyId } },
  });
  if (existing?.status === "active") {
    return { ok: false, message: "Dieser Eigentümer hat bereits Zugriff auf dieses Objekt." };
  }

  await grantAccess(ownerId, propertyId);

  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath(`/admin/owners/${ownerId}`);
  revalidatePath("/admin/owners");
  revalidatePath("/admin/properties");
  return { ok: true, message: `${owner.name} wurde ${property.name} zugeordnet.` };
}

/** Soft-revokes one owner's access to one property (status -> "inactive", never deleted). */
export async function removeOwnerFromPropertyAction(propertyId: string, ownerId: string): Promise<ActionResult> {
  await requireAdminRole();

  const [property, owner] = await Promise.all([getProperty(propertyId), getOwner(ownerId)]);
  if (!property) return { ok: false, message: "Objekt nicht gefunden." };
  if (!owner) return { ok: false, message: "Eigentümer nicht gefunden." };

  await revokeAccess(ownerId, propertyId);

  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath(`/admin/owners/${ownerId}`);
  revalidatePath("/admin/owners");
  revalidatePath("/admin/properties");
  return { ok: true, message: `Zugriff von ${owner.name} auf ${property.name} wurde entfernt.` };
}

/**
 * "Internes Objekt anlegen" from the /admin/properties apaleo table: creates
 * a brand-new internal Property already mapped to `apaleoPropertyId` - the
 * id itself is never taken from the form (it comes from the apaleo row the
 * admin clicked, passed as its own argument), so it can't be hand-edited
 * into a typo or a value that wasn't actually offered. Same one-to-one
 * uniqueness rule as setApaleoPropertyMappingAction, just checked against
 * "any" existing property since this is always a brand-new row.
 */
export async function createPropertyFromApaleoAction(apaleoPropertyId: string, formData: FormData): Promise<ActionResult> {
  await requireAdminRole();

  const trimmedApaleoId = apaleoPropertyId.trim();
  if (!trimmedApaleoId) return { ok: false, message: "Keine apaleo Property-ID angegeben." };

  const name = readString(formData, "name");
  const location = readString(formData, "location");
  const status = readString(formData, "status") === "inactive" ? "inactive" : "active";
  if (!name || !location) return { ok: false, message: "Bitte Objektname und Standort angeben." };

  const conflict = await prisma.property.findFirst({ where: { apaleoPropertyId: trimmedApaleoId } });
  if (conflict) {
    return { ok: false, message: "Dieses apaleo-Objekt ist bereits einem anderen internen Objekt zugeordnet." };
  }

  const property = await createProperty({ name, location, status, apaleoPropertyId: trimmedApaleoId });

  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${property.id}`);
  revalidatePath("/admin");
  revalidatePath("/admin/integrations");
  return { ok: true, message: `${name} wurde angelegt und mit apaleo verknüpft.` };
}

/**
 * "Eigentümer endgültig löschen" - Gefahrenbereich action. Deliberately
 * re-checks every dependency inside deleteOwnerPermanently's own transaction
 * rather than trusting whatever the page last rendered - the id itself is
 * the only client input this trusts, and it's validated against the real
 * Owner table (never assumed to exist). On success the owner detail page no
 * longer exists, so the caller redirects to the list; that happens outside
 * this action (see DeleteOwnerButton) so a failed delete never navigates
 * away.
 */
export async function deleteOwnerAction(ownerId: string): Promise<ActionResult> {
  await requireAdminRole();

  const result = await deleteOwnerPermanently(ownerId);
  if (!result.ok) return result;

  revalidatePath("/admin/owners");
  revalidatePath("/admin");
  return result;
}

export interface GoogleDriveSyncActionResult {
  ok: boolean;
  message: string;
  result: GoogleDriveSyncResult;
}

/**
 * "Google Drive synchronisieren" on /admin/statements - the ONLY place this
 * ever runs (no cron, no automation - see documentSync.ts's own doc
 * comment). `ok` reflects whether the sync ran at all, not whether every
 * property/month succeeded - per-item failures are isolated and listed in
 * `result.errors` instead of aborting the whole run (spec point 17).
 */
export async function syncGoogleDriveDocumentsAction(): Promise<GoogleDriveSyncActionResult> {
  await requireAdminRole();

  const result = await syncGoogleDriveDocuments();
  revalidatePath("/admin/statements");

  const message =
    `${result.propertiesChecked} Objekte geprüft · ${result.documentsSeen} Dokumente erkannt · ` +
    `${result.documentsCreated} neu · ${result.documentsUpdated} aktualisiert · ` +
    `${result.documentsNeedingClassification} benötigt Klassifizierung · ${result.documentsArchived} archiviert · ` +
    `${result.errors.length} Fehler`;

  return { ok: true, message, result };
}

/**
 * "Prüfen" modal's save action on /admin/statements - corrects
 * property/period/type on a Drive-synced (or manually created) document.
 * See services/admin/statementService.ts#updateStatementDocumentFields for
 * exactly which fields this can and cannot touch.
 */
export async function updateStatementDocumentAction(
  id: string,
  input: StatementDocumentUpdateInput
): Promise<ActionResult> {
  await requireAdminRole();

  try {
    await updateStatementDocumentFields(id, input);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Dokument konnte nicht aktualisiert werden." };
  }
  revalidatePath("/admin/statements");
  return { ok: true, message: "Dokument aktualisiert." };
}

export async function publishStatementDocumentAction(id: string): Promise<ActionResult> {
  await requireAdminRole();

  try {
    await publishStatementDocument(id);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Dokument konnte nicht veröffentlicht werden." };
  }
  revalidatePath("/admin/statements");
  return { ok: true, message: "Dokument veröffentlicht." };
}

export async function archiveStatementDocumentAction(id: string): Promise<ActionResult> {
  await requireAdminRole();

  await archiveStatementDocument(id);
  revalidatePath("/admin/statements");
  return { ok: true, message: "Dokument archiviert." };
}

/**
 * "Admin einladen" - the admin-account counterpart to createOwnerUserAction,
 * reusing createAdminAccount (which itself reuses the exact same invitation
 * mechanics as owner invites - see src/server/invitations.ts). The admin
 * role is never taken from `formData`: createAdminAccount always sets
 * `role: "admin"` server-side (see createInvitedAdmin), so nothing in this
 * form can ever request a different role.
 */
export async function createAdminAccountAction(formData: FormData): Promise<InvitationActionResult> {
  const session = await requireAdminRole();

  const firstName = readString(formData, "firstName");
  const lastName = readString(formData, "lastName");
  const email = readString(formData, "email");
  if (!firstName || !lastName || !email) {
    return { ok: false, message: "Bitte alle Felder ausfüllen." };
  }

  let inviteToken: string;
  let inviteExpiresAt: string;
  try {
    ({ inviteToken, inviteExpiresAt } = await createAdminAccount({ firstName, lastName, email }, session.userId));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Administrator konnte nicht angelegt werden." };
  }
  revalidatePath("/admin/admins");
  return {
    ok: true,
    message: `${firstName} ${lastName} wurde eingeladen. Einladung erstellt.`,
    inviteToken,
    inviteExpiresAt,
  };
}

/**
 * "Einladung neu erstellen" for a not-yet-active admin - revokes any still-
 * open invitation and issues a fresh one, mirroring
 * recreateOwnerInvitationAction.
 */
export async function recreateAdminInvitationAction(userId: string): Promise<InvitationActionResult> {
  const session = await requireAdminRole();

  let inviteToken: string;
  let inviteExpiresAt: string;
  try {
    ({ inviteToken, inviteExpiresAt } = await recreateAdminInvitation(userId, session.userId));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Einladung konnte nicht erstellt werden." };
  }
  revalidatePath("/admin/admins");
  return { ok: true, message: "Neue Einladung erstellt.", inviteToken, inviteExpiresAt };
}

/**
 * "Deaktivieren"/"Reaktivieren" for an admin account. `session.userId` -
 * resolved server-side from the acting admin's own session, never a form
 * field - is what setAdminAccountStatus checks self-deactivation and the
 * last-active-admin rule against; a client can never pass a different
 * "acting admin" to bypass either protection.
 */
export async function setAdminAccountStatusAction(userId: string, status: AdminAccountStatus): Promise<ActionResult> {
  const session = await requireAdminRole();

  const result = await setAdminAccountStatus(userId, status, session.userId);
  if (result.ok) revalidatePath("/admin/admins");
  return result;
}

/**
 * "Endgültig löschen" for an admin account - see
 * adminUserService.ts#deleteAdminAccountPermanently for the actual
 * self-delete/last-active-admin safety checks, re-verified there against
 * the real database rather than trusted from the client.
 */
export async function deleteAdminAccountAction(userId: string): Promise<ActionResult> {
  const session = await requireAdminRole();

  const result = await deleteAdminAccountPermanently(userId, session.userId);
  if (result.ok) revalidatePath("/admin/admins");
  return result;
}
