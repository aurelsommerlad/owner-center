import type { ComponentType, SVGProps } from "react";
import type { AdminDocumentType, AdminGeneralDocumentCategory, UserRole } from "@/types/admin";
import { CreditNoteIcon, DocumentsIcon, ReceiptIcon } from "@/components/ui/icons";

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

/** Mirrors statementDocumentIcon (owner side) - Rechnung/Gutschrift each get a distinct symbol so several of each in one month (e.g. after a cancellation) stay tellable apart at a glance. */
export const ADMIN_DOCUMENT_TYPE_ICON: Record<AdminDocumentType, ComponentType<SVGProps<SVGSVGElement>>> = {
  owner_report: DocumentsIcon,
  invoice: ReceiptIcon,
  credit_note: CreditNoteIcon,
  other: DocumentsIcon,
};

export const ADMIN_GENERAL_DOCUMENT_CATEGORY_LABEL: Record<AdminGeneralDocumentCategory, string> = {
  vertrag: "Vertrag",
  steuerunterlage: "Steuerunterlage",
  objektunterlage: "Objektunterlage",
  versicherung: "Versicherung",
  sonstiges: "Sonstiges",
};
