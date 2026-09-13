"use server";

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
