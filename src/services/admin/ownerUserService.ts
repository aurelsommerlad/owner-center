import type { AccountStatus, AdminOwnerUser } from "@/types/admin";
import { prisma } from "@/server/db";
import { hashPassword, generateTempPassword } from "@/server/password";
import { getUsersForOwner, toAdminOwnerUser } from "@/lib/adminPermissions";

/**
 * Reads and writes against the real `OwnerUser`/`User` tables. Creating an
 * owner login now genuinely creates a `User` row (email + password hash) in
 * addition to the `OwnerUser` link - there is no invitation-email flow yet
 * (explicitly out of scope), so a random temporary password is generated
 * and handed back to the caller, which surfaces it in the admin success
 * toast for the admin to relay manually.
 */

export async function getOwnerUsers(ownerId: string): Promise<AdminOwnerUser[]> {
  return getUsersForOwner(ownerId);
}

export async function getOwnerUser(id: string): Promise<AdminOwnerUser | undefined> {
  const ownerUser = await prisma.ownerUser.findUnique({ where: { id }, include: { user: true } });
  return ownerUser ? toAdminOwnerUser(ownerUser) : undefined;
}

export interface CreateOwnerUserInput {
  ownerId: string;
  firstName: string;
  lastName: string;
  email: string;
  status?: AccountStatus;
}

export interface CreateOwnerUserResult {
  user: AdminOwnerUser;
  tempPassword: string;
}

export async function createOwnerUser(input: CreateOwnerUserInput): Promise<CreateOwnerUserResult> {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error(`Diese E-Mail-Adresse (${email}) ist bereits vergeben.`);
  }

  const tempPassword = generateTempPassword();
  const loginUser = await prisma.user.create({
    data: { email, passwordHash: hashPassword(tempPassword), role: "owner" },
  });
  const ownerUser = await prisma.ownerUser.create({
    data: {
      ownerId: input.ownerId,
      userId: loginUser.id,
      firstName: input.firstName,
      lastName: input.lastName,
      status: input.status ?? "active",
    },
    include: { user: true },
  });

  return { user: toAdminOwnerUser(ownerUser), tempPassword };
}

export interface UpdateOwnerUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: AccountStatus;
}

export async function updateOwnerUser(id: string, input: UpdateOwnerUserInput): Promise<AdminOwnerUser | undefined> {
  const ownerUser = await prisma.ownerUser.findUnique({ where: { id } });
  if (!ownerUser) return undefined;

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== ownerUser.userId) {
      throw new Error(`Diese E-Mail-Adresse (${email}) ist bereits vergeben.`);
    }
    await prisma.user.update({ where: { id: ownerUser.userId }, data: { email } });
  }

  const updated = await prisma.ownerUser.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      status: input.status,
    },
    include: { user: true },
  });
  return toAdminOwnerUser(updated);
}

export async function setOwnerUserStatus(id: string, status: AccountStatus): Promise<AdminOwnerUser | undefined> {
  return updateOwnerUser(id, { status });
}
