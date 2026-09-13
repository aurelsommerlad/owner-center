import type { OwnerPropertyAccess } from "@/types/admin";

/**
 * Central mock "table" for owner↔property access - mutated directly by
 * accessService.ts. ΛLPILΛ is deliberately linked to two owners, to
 * exercise the many-to-many relationship (not every property has exactly
 * one owner). The Schneider↔HØV row is deliberately "inactive": a
 * previously granted, since-revoked access, to exercise that access is
 * soft-revoked (status flips) rather than deleted.
 */
export const ownerPropertyAccess: OwnerPropertyAccess[] = [
  {
    id: "access-schneider-laeke",
    ownerId: "admin-owner-schneider",
    propertyId: "admin-property-laeke",
    status: "active",
    createdAt: "2024-01-10",
  },
  {
    id: "access-schneider-alpila",
    ownerId: "admin-owner-schneider",
    propertyId: "admin-property-alpila",
    status: "active",
    createdAt: "2026-08-25",
  },
  {
    id: "access-schneider-hoev",
    ownerId: "admin-owner-schneider",
    propertyId: "admin-property-hoev",
    status: "inactive",
    createdAt: "2024-02-01",
  },
  {
    id: "access-berger-hoev",
    ownerId: "admin-owner-berger",
    propertyId: "admin-property-hoev",
    status: "active",
    createdAt: "2024-06-01",
  },
  {
    id: "access-berger-alpila",
    ownerId: "admin-owner-berger",
    propertyId: "admin-property-alpila",
    status: "active",
    createdAt: "2026-08-25",
  },
  {
    id: "access-thalberg-husle",
    ownerId: "admin-owner-thalberg",
    propertyId: "admin-property-husle",
    status: "active",
    createdAt: "2026-09-01",
  },
];
