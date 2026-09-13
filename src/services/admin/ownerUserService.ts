import { randomUUID } from "crypto";
import type { AccountStatus, AdminOwnerUser } from "@/types/admin";
import { adminOwnerUsers } from "@/data/admin";
import { getUsersForOwner } from "@/lib/adminPermissions";

/** Reads and writes against the central `adminOwnerUsers` mock array. */

export async function getOwnerUsers(ownerId: string): Promise<AdminOwnerUser[]> {
  return getUsersForOwner(ownerId);
}

export async function getOwnerUser(id: string): Promise<AdminOwnerUser | undefined> {
  return adminOwnerUsers.find((user) => user.id === id);
}

export interface CreateOwnerUserInput {
  ownerId: string;
  firstName: string;
  lastName: string;
  email: string;
  status?: AccountStatus;
}

export async function createOwnerUser(input: CreateOwnerUserInput): Promise<AdminOwnerUser> {
  const now = new Date().toISOString().slice(0, 10);
  const user: AdminOwnerUser = {
    id: `admin-user-${randomUUID()}`,
    ownerId: input.ownerId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    role: "owner",
    status: input.status ?? "active",
    createdAt: now,
    updatedAt: now,
  };
  adminOwnerUsers.push(user);
  return user;
}

export interface UpdateOwnerUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: AccountStatus;
}

export async function updateOwnerUser(id: string, input: UpdateOwnerUserInput): Promise<AdminOwnerUser | undefined> {
  const user = adminOwnerUsers.find((candidate) => candidate.id === id);
  if (!user) return undefined;
  if (input.firstName !== undefined) user.firstName = input.firstName;
  if (input.lastName !== undefined) user.lastName = input.lastName;
  if (input.email !== undefined) user.email = input.email;
  if (input.status !== undefined) user.status = input.status;
  user.updatedAt = new Date().toISOString().slice(0, 10);
  return user;
}

export async function setOwnerUserStatus(id: string, status: AccountStatus): Promise<AdminOwnerUser | undefined> {
  return updateOwnerUser(id, { status });
}
