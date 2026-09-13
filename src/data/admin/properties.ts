import type { AdminProperty } from "@/types/admin";

export const adminProperties: AdminProperty[] = [
  {
    id: "admin-property-laeke",
    name: "LÆKE",
    location: "Lindau · Bodensee",
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
    location: "Sylt · Nordsee",
    status: "active",
    apaleoPropertyId: "HOEV-SH",
    statementsDriveFolderId: "drive-hoev-statements",
    documentsDriveFolderId: "drive-hoev-documents",
    createdAt: "2024-06-01",
    updatedAt: "2026-07-15",
  },
  {
    id: "admin-property-alpila",
    name: "ΛLPILΛ",
    location: "Kitzbühel · Tirol",
    status: "onboarding",
    apaleoPropertyId: null,
    statementsDriveFolderId: null,
    documentsDriveFolderId: null,
    createdAt: "2026-08-25",
    updatedAt: "2026-08-25",
  },
];
