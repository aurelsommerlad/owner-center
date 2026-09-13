import { randomUUID } from "crypto";
import type { AccountStatus, AdminOwner, AdminProperty } from "@/types/admin";
import { adminOwners } from "@/data/admin";
import { getPropertiesForOwner as getPropertiesForOwnerPermission, getUsersForOwner } from "@/lib/adminPermissions";

/**
 * Reads and writes against the central `adminOwners` mock array (see
 * data/admin/owners.ts). This is the seam a later database swap replaces:
 * every function here keeps its signature, only the body changes from
 * "array find/push" to a real query/insert.
 */

export interface OwnerFilters {
  /** Matched against name, companyName, and any of the owner's users' emails. */
  search?: string;
  status?: AccountStatus;
}

export async function getOwners(filters: OwnerFilters = {}): Promise<AdminOwner[]> {
  const search = filters.search?.trim().toLowerCase();
  return adminOwners.filter((owner) => {
    if (filters.status && owner.status !== filters.status) return false;
    if (!search) return true;
    const emails = getUsersForOwner(owner.id).map((user) => user.email);
    const haystack = [owner.name, owner.companyName ?? "", ...emails].join(" ").toLowerCase();
    return haystack.includes(search);
  });
}

export async function getOwner(id: string): Promise<AdminOwner | undefined> {
  return adminOwners.find((owner) => owner.id === id);
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
  const now = new Date().toISOString().slice(0, 10);
  const owner: AdminOwner = {
    id: `admin-owner-${randomUUID()}`,
    name: input.name,
    companyName: input.companyName,
    status: input.status ?? "active",
    createdAt: now,
    updatedAt: now,
  };
  adminOwners.push(owner);
  return owner;
}

export interface UpdateOwnerInput {
  name?: string;
  companyName?: string;
  status?: AccountStatus;
}

export async function updateOwner(id: string, input: UpdateOwnerInput): Promise<AdminOwner | undefined> {
  const owner = adminOwners.find((candidate) => candidate.id === id);
  if (!owner) return undefined;
  if (input.name !== undefined) owner.name = input.name;
  if (input.companyName !== undefined) owner.companyName = input.companyName || undefined;
  if (input.status !== undefined) owner.status = input.status;
  owner.updatedAt = new Date().toISOString().slice(0, 10);
  return owner;
}

export async function setOwnerStatus(id: string, status: AccountStatus): Promise<AdminOwner | undefined> {
  return updateOwner(id, { status });
}
