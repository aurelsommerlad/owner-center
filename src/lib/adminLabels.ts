import type { AdminDocumentType, AdminGeneralDocumentCategory, UserRole } from "@/types/admin";

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  owner: "Eigentümer",
};

export const ADMIN_DOCUMENT_TYPE_LABEL: Record<AdminDocumentType, string> = {
  owner_report: "Eigentümerreporting",
  invoice: "Rechnung",
  credit_note: "Gutschrift",
  other: "Beleg",
};

export const ADMIN_GENERAL_DOCUMENT_CATEGORY_LABEL: Record<AdminGeneralDocumentCategory, string> = {
  vertrag: "Vertrag",
  steuerunterlage: "Steuerunterlage",
  objektunterlage: "Objektunterlage",
  versicherung: "Versicherung",
  sonstiges: "Sonstiges",
};
