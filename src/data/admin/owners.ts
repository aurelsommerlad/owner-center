import type { AdminOwner } from "@/types/admin";

export const adminOwners: AdminOwner[] = [
  {
    id: "admin-owner-schneider",
    name: "Familie Schneider",
    company: "Schneider Immobilien GmbH",
    email: "schneider@example.com",
    status: "active",
    role: "owner",
    createdAt: "2024-01-15",
    lastLoginAt: "2026-09-08",
  },
  {
    id: "admin-owner-berger",
    name: "Dr. Anna Berger",
    company: "Berger Capital Living GmbH",
    email: "a.berger@example.com",
    status: "active",
    role: "owner",
    createdAt: "2024-06-02",
    lastLoginAt: "2026-09-05",
  },
  {
    id: "admin-owner-thalberg",
    name: "Michael Thalberg",
    company: "Thalberg Invest",
    email: "m.thalberg@example.com",
    status: "inactive",
    role: "owner",
    createdAt: "2025-02-20",
    lastLoginAt: "2025-11-12",
  },
];
