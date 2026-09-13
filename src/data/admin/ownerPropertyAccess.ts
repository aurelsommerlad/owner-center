import type { OwnerPropertyAccess } from "@/types/admin";

// ΛLPILΛ is deliberately linked to two owners, to exercise the
// many-to-many relationship (not every property has exactly one owner).
export const ownerPropertyAccess: OwnerPropertyAccess[] = [
  {
    id: "access-schneider-laeke",
    ownerId: "admin-owner-schneider",
    propertyId: "admin-property-laeke",
    createdAt: "2024-01-10",
  },
  {
    id: "access-berger-hoev",
    ownerId: "admin-owner-berger",
    propertyId: "admin-property-hoev",
    createdAt: "2024-06-01",
  },
  {
    id: "access-schneider-alpila",
    ownerId: "admin-owner-schneider",
    propertyId: "admin-property-alpila",
    createdAt: "2026-08-25",
  },
  {
    id: "access-berger-alpila",
    ownerId: "admin-owner-berger",
    propertyId: "admin-property-alpila",
    createdAt: "2026-08-25",
  },
];
