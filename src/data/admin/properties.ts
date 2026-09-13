import type { AdminProperty } from "@/types/admin";

/** Central mock "table" for properties - mutated directly by propertyService.ts. */
export const adminProperties: AdminProperty[] = [
  {
    id: "admin-property-laeke",
    name: "LÆKE",
    location: "Lindau",
    status: "active",
    apaleoPropertyId: "LAEKE-BW",
    statementsDriveFolderId: "drive-laeke-statements",
    documentsDriveFolderId: "drive-laeke-documents",
    createdAt: "2024-01-10",
    updatedAt: "2026-08-20",
  },
  {
    id: "admin-property-hoev",
    name: "HØV",
    location: "Altusried",
    status: "active",
    apaleoPropertyId: "HOEV-BY",
    statementsDriveFolderId: "drive-hoev-statements",
    documentsDriveFolderId: "drive-hoev-documents",
    createdAt: "2024-06-01",
    updatedAt: "2026-07-15",
  },
  {
    id: "admin-property-alpila",
    name: "ΛLPILΛ",
    location: "Gaschurn",
    status: "active",
    createdAt: "2026-08-25",
    updatedAt: "2026-08-25",
  },
  {
    id: "admin-property-husle",
    name: "HŪSLE",
    location: "Bludenz",
    status: "active",
    apaleoPropertyId: "HUSLE-VBG",
    createdAt: "2026-09-01",
    updatedAt: "2026-09-01",
  },
];
