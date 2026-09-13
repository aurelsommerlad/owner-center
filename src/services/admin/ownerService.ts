import type { AccountStatus, AdminOwner } from "@/types/admin";
import { prisma } from "@/server/db";
import {
  getPropertiesForOwner as getPropertiesForOwnerPermission,
  getUsersForOwner,
  toAdminOwner,
} from "@/lib/adminPermissions";
import type { AdminProperty } from "@/types/admin";

/**
 * Reads and writes against the real `Owner` table. This is the seam a
 * mock-array version of this file used to fill: every function here keeps
 * its signature, only the body changed from "array find/push" to a real
 * Prisma query/insert.
 */

export interface OwnerFilters {
  /** Matched against name, companyName, and any of the owner's users' emails. */
  search?: string;
  status?: AccountStatus;
}

export async function getOwners(filters: OwnerFilters = {}): Promise<AdminOwner[]> {
  const owners = await prisma.owner.findMany({
    where: filters.status ? { status: filters.status } : undefined,
    orderBy: { createdAt: "desc" },
  });

  const search = filters.search?.trim().toLowerCase();
  if (!search) return owners.map(toAdminOwner);

  const results: AdminOwner[] = [];
  for (const owner of owners) {
    const emails = (await getUsersForOwner(owner.id)).map((user) => user.email);
    const haystack = [owner.name, owner.companyName ?? "", ...emails].join(" ").toLowerCase();
    if (haystack.includes(search)) results.push(toAdminOwner(owner));
  }
  return results;
}

export async function getOwner(id: string): Promise<AdminOwner | undefined> {
  const owner = await prisma.owner.findUnique({ where: { id } });
  return owner ? toAdminOwner(owner) : undefined;
}

/** Properties this owner has active access to, via OwnerPropertyAccess (many-to-many). */
export async function getPropertiesForOwner(ownerId: string): Promise<AdminProperty[]> {
  return getPropertiesForOwnerPermission(ownerId);
}

export interface CreateOwnerInput {
  name: string;
  companyName?: string;
  status?: AccountStatus;
}

export async function createOwner(input: CreateOwnerInput): Promise<AdminOwner> {
  const owner = await prisma.owner.create({
    data: {
      name: input.name,
      companyName: input.companyName,
      status: input.status ?? "active",
    },
  });
  return toAdminOwner(owner);
}

export interface UpdateOwnerInput {
  name?: string;
  companyName?: string;
  status?: AccountStatus;
}

export async function updateOwner(id: string, input: UpdateOwnerInput): Promise<AdminOwner | undefined> {
  const owner = await prisma.owner
    .update({
      where: { id },
      data: {
        name: input.name,
        companyName: input.companyName === undefined ? undefined : input.companyName || null,
        status: input.status,
      },
    })
    .catch(() => null);
  return owner ? toAdminOwner(owner) : undefined;
}

export async function setOwnerStatus(id: string, status: AccountStatus): Promise<AdminOwner | undefined> {
  return updateOwner(id, { status });
}
