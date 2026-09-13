import type { AdminOwner } from "@/types/admin";

/**
 * Central mock "table" for owners. Exported as a mutable array on purpose -
 * services/admin/ownerService.ts's create/update functions push/mutate
 * directly into this array, which is what makes the Admin CRUD flows
 * actually work within a session (see that file's module comment for the
 * seam a later database swap replaces this array with).
 */
export const adminOwners: AdminOwner[] = [
  {
    id: "admin-owner-schneider",
    name: "Familie Schneider",
    companyName: "Schneider Immobilien GmbH",
    status: "active",
    createdAt: "2024-01-15",
    updatedAt: "2024-01-15",
  },
  {
    id: "admin-owner-berger",
    name: "Dr. Anna Berger",
    companyName: "Berger Capital Living GmbH",
    status: "active",
    createdAt: "2024-06-02",
    updatedAt: "2024-06-02",
  },
  {
    id: "admin-owner-thalberg",
    name: "Michael Thalberg",
    companyName: "Thalberg Invest",
    status: "inactive",
    createdAt: "2025-02-20",
    updatedAt: "2025-11-12",
  },
];
