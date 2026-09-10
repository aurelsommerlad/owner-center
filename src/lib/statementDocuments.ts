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
  owner_report: "Eigentümerreporting",
  invoice: "Rechnung",
  credit_note: "Gutschrift",
  other: "Weiteres Dokument",
};

/**
 * The three fachlich defined types always display their fixed label. Only
 * "other" documents show their specific stored `title` (e.g. "Ergänzende
 * Unterlage"), since the generic "Weiteres Dokument" label alone wouldn't
 * distinguish several such documents in the same month.
 */
export function statementDocumentDisplayTitle(document: StatementDocument): string {
  return document.documentType === "other" ? document.title : STATEMENT_DOCUMENT_TYPE_LABEL[document.documentType];
}

/** Fixed display order for the two "standard" documents alongside the owner report. */
const STANDARD_DOCUMENT_ORDER: StatementDocumentType[] = ["invoice", "credit_note"];

export interface StatementMonthGroup {
  year: number;
  month: number;
  /** The Eigentümerreporting, if this month has one - the month's main document. */
  ownerReport: StatementDocument | undefined;
  /** Rechnung and Gutschrift, in that fixed order, whichever of the two exist. */
  standardDocuments: StatementDocument[];
  /** Any further ("other") documents for this month, oldest first. */
  extraDocuments: StatementDocument[];
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
      const ownerReport = monthDocuments.find((doc) => doc.documentType === "owner_report");
      const standardDocuments = STANDARD_DOCUMENT_ORDER.flatMap((type) => {
        const doc = monthDocuments.find((candidate) => candidate.documentType === type);
        return doc ? [doc] : [];
      });
      const extraDocuments = monthDocuments
        .filter((doc) => doc.documentType === "other")
        .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));

      return {
        year: monthDocuments[0].year,
        month,
        ownerReport,
        standardDocuments,
        extraDocuments,
        documentCount: monthDocuments.length,
        newCount: monthDocuments.filter(isNewStatementDocument).length,
      };
    });
}

export function statementMonthGroupLabel(group: { year: number; month: number }): string {
  return `${monthLabel(group.month)} ${group.year}`;
}
