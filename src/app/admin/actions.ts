"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AccountStatus } from "@/types/admin";
import { requireAdminRole } from "@/lib/adminAuth";
import { createOwner, updateOwner } from "@/services/admin/ownerService";
import { createOwnerUser, updateOwnerUser } from "@/services/admin/ownerUserService";
import { createProperty, getProperty, updateProperty } from "@/services/admin/propertyService";
import { grantAccess, setOwnerPropertyAccess, setPropertyOwnerAccess } from "@/services/admin/accessService";
import { testApaleoConnection, type ApaleoConnectionStatus } from "@/server/integrations/apaleo/connectionCheck";
import { getApaleoProperty } from "@/server/integrations/apaleo/propertyService";
import { getUnitsForProperty } from "@/server/integrations/apaleo/unitService";
import { describeApaleoError } from "@/server/integrations/apaleo/errors";
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

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createOwnerAction(formData: FormData): Promise<ActionResult> {
  await requireAdminRole();

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
  let tempPassword: string;
  try {
    ({ tempPassword } = await createOwnerUser({ ownerId: owner.id, firstName, lastName, email }));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Nutzer konnte nicht angelegt werden." };
  }
  for (const propertyId of propertyIds) {
    await grantAccess(owner.id, propertyId);
  }

  revalidatePath("/admin/owners");
  revalidatePath("/admin/properties");
  revalidatePath("/admin");
  return {
    ok: true,
    message: `${name} wurde angelegt. Vorläufiges Passwort für ${email}: ${tempPassword}`,
  };
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

export async function createOwnerUserAction(formData: FormData): Promise<ActionResult> {
  await requireAdminRole();

  const ownerId = readString(formData, "ownerId");
  const firstName = readString(formData, "firstName");
  const lastName = readString(formData, "lastName");
  const email = readString(formData, "email");
  if (!ownerId || !firstName || !lastName || !email) {
    return { ok: false, message: "Bitte alle Felder ausfüllen." };
  }
  let tempPassword: string;
  try {
    ({ tempPassword } = await createOwnerUser({ ownerId, firstName, lastName, email }));
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Nutzer konnte nicht angelegt werden." };
  }
  revalidatePath(`/admin/owners/${ownerId}`);
  return {
    ok: true,
    message: `${firstName} ${lastName} wurde hinzugefügt. Vorläufiges Passwort für ${email}: ${tempPassword}`,
  };
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

  await updateOwnerUser(userId, { status });
  revalidatePath(`/admin/owners/${ownerId}`);
  return { ok: true, message: `${userName} wurde ${status === "active" ? "aktiviert" : "deaktiviert"}.` };
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

  const apaleoPropertyId = readString(formData, "apaleoPropertyId");
  const statementsDriveFolderId = readString(formData, "statementsDriveFolderId");
  const documentsDriveFolderId = readString(formData, "documentsDriveFolderId");
  const ownerIds = formData.getAll("ownerIds").map(String);

  const property = await createProperty({
    name,
    location,
    apaleoPropertyId: apaleoPropertyId || undefined,
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

  const apaleoPropertyId = readString(formData, "apaleoPropertyId");
  const statementsDriveFolderId = readString(formData, "statementsDriveFolderId");
  const documentsDriveFolderId = readString(formData, "documentsDriveFolderId");
  const ownerIds = formData.getAll("ownerIds").map(String);

  await updateProperty(propertyId, {
    name,
    location,
    apaleoPropertyId: apaleoPropertyId || undefined,
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
