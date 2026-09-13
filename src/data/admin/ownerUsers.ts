import type { AdminOwnerUser } from "@/types/admin";

export const adminOwnerUsers: AdminOwnerUser[] = [
  {
    id: "admin-user-schneider-1",
    ownerId: "admin-owner-schneider",
    name: "Julia Schneider",
    email: "j.schneider@example.com",
    role: "owner",
    status: "active",
    createdAt: "2024-01-15",
    lastLoginAt: "2026-09-08",
  },
  {
    id: "admin-user-schneider-2",
    ownerId: "admin-owner-schneider",
    name: "Markus Schneider",
    email: "m.schneider@example.com",
    role: "owner_user",
    status: "active",
    createdAt: "2024-03-01",
    lastLoginAt: "2026-08-30",
  },
  {
    id: "admin-user-berger-1",
    ownerId: "admin-owner-berger",
    name: "Anna Berger",
    email: "a.berger@example.com",
    role: "owner",
    status: "active",
    createdAt: "2024-06-02",
    lastLoginAt: "2026-09-05",
  },
  {
    id: "admin-user-thalberg-1",
    ownerId: "admin-owner-thalberg",
    name: "Michael Thalberg",
    email: "m.thalberg@example.com",
    role: "owner",
    status: "inactive",
    createdAt: "2025-02-20",
    lastLoginAt: "2025-11-12",
  },
];
