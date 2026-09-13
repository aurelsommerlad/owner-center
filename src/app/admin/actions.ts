"use server";

import { revalidatePath } from "next/cache";
import type { AccountStatus } from "@/types/admin";
import { createOwner, updateOwner } from "@/services/admin/ownerService";
import { createOwnerUser, updateOwnerUser } from "@/services/admin/ownerUserService";
import { createProperty, updateProperty } from "@/services/admin/propertyService";
import { grantAccess, setOwnerPropertyAccess, setPropertyOwnerAccess } from "@/services/admin/accessService";

/**
 * Server Actions for the owner/user/property admin flows. Each one mutates
 * the central in-memory mock arrays (via services/admin/*) and then calls
 * revalidatePath so the affected Server Components re-render with the new
 * data - there is no client-side cache to keep in sync separately.
 *
 * This is the exact seam a later database swap replaces: once persistence
 * exists, only the service-layer bodies change (array mutation -> real
 * query), these action signatures and their revalidatePath calls stay the
 * same.
 */

export interface ActionResult {
  ok: boolean;
  message: string;
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createOwnerAction(formData: FormData): Promise<ActionResult> {
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
  await updateOwner(ownerId, { status });
  revalidatePath("/admin/owners");
  revalidatePath(`/admin/owners/${ownerId}`);
  revalidatePath("/admin");
  return { ok: true, message: `${ownerName} wurde ${status === "active" ? "aktiviert" : "deaktiviert"}.` };
}

export async function createOwnerUserAction(formData: FormData): Promise<ActionResult> {
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
  await updateOwnerUser(userId, { status });
  revalidatePath(`/admin/owners/${ownerId}`);
  return { ok: true, message: `${userName} wurde ${status === "active" ? "aktiviert" : "deaktiviert"}.` };
}

export async function updateOwnerAccessAction(ownerId: string, propertyIds: string[]): Promise<ActionResult> {
  await setOwnerPropertyAccess(ownerId, propertyIds);
  revalidatePath(`/admin/owners/${ownerId}`);
  revalidatePath("/admin/owners");
  revalidatePath("/admin/properties");
  return { ok: true, message: "Objektzugriff wurde aktualisiert." };
}

export async function createPropertyAction(formData: FormData): Promise<ActionResult> {
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
