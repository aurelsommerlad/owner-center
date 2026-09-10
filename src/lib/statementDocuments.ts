import type { StatementDocument, StatementDocumentType } from "@/types";
import { monthLabel } from "@/lib/dates";

/**
 * A statement counts as unseen - and is shown as "Neu" - until it has been
 * opened on or after its most recent publish/update. Comparing against
 * `updatedAt` (falling back to `publishedAt`) is what makes a corrected
 * version reappear as "Neu" without any reset logic on the record itself.
 */
export function isNewStatementDocument(document: StatementDocument): boolean {
  const referenceDate = document.updatedAt ?? document.publishedAt;
  return !document.firstViewedAt || document.firstViewedAt < referenceDate;
}

export function isDownloadedStatementDocument(document: StatementDocument): boolean {
  return document.downloadCount > 0 && document.lastDownloadedAt !== null;
}

export const STATEMENT_DOCUMENT_TYPE_LABEL: Record<StatementDocumentType, string> = {
  monthly_statement: "Monatsabrechnung",
  invoice: "Rechnung",
  credit_note: "Gutschrift",
  corrected_invoice: "Korrekturrechnung",
  service_charge_statement: "Nebenkostenabrechnung",
  other: "Sonstiges Dokument",
};

/**
 * Types whose generic label is informative enough on its own within an
 * already-grouped-by-month view ("Monatsabrechnung", "Gutschrift", ...).
 * "invoice" and "other" instead show their specific `title` (e.g. "Rechnung
 * zusätzliche Leistungen"), since the generic label alone wouldn't say much.
 */
const GENERIC_LABEL_TYPES = new Set<StatementDocumentType>([
  "monthly_statement",
  "credit_note",
  "corrected_invoice",
  "service_charge_statement",
]);

export function statementDocumentDisplayTitle(document: StatementDocument): string {
  return GENERIC_LABEL_TYPES.has(document.documentType)
    ? STATEMENT_DOCUMENT_TYPE_LABEL[document.documentType]
    : document.title;
}

export interface StatementMonthGroup {
  year: number;
  month: number;
  /** The main monthly statement, if this month has one. */
  mainDocument: StatementDocument | undefined;
  /** Every other document for this month, oldest first. */
  otherDocuments: StatementDocument[];
  documentCount: number;
  newCount: number;
}

/** Groups a year's flat document list by month, newest month first. */
export function groupStatementDocumentsByMonth(documents: StatementDocument[]): StatementMonthGroup[] {
  const byMonth = new Map<number, StatementDocument[]>();
  for (const document of documents) {
    const bucket = byMonth.get(document.month) ?? [];
    bucket.push(document);
    byMonth.set(document.month, bucket);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b - a)
    .map(([month, monthDocuments]) => {
      const mainDocument = monthDocuments.find((doc) => doc.documentType === "monthly_statement");
      const otherDocuments = monthDocuments
        .filter((doc) => doc !== mainDocument)
        .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
      return {
        year: monthDocuments[0].year,
        month,
        mainDocument,
        otherDocuments,
        documentCount: monthDocuments.length,
        newCount: monthDocuments.filter(isNewStatementDocument).length,
      };
    });
}

export function statementMonthGroupLabel(group: { year: number; month: number }): string {
  return `${monthLabel(group.month)} ${group.year}`;
}
