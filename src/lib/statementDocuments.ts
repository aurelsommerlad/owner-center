import type { StatementDocument, StatementDocumentType } from "@/types";
import { monthLabel } from "@/lib/dates";
import { getDictionary, type Locale } from "@/i18n";

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

/** Locale-aware label for the three fachlich defined document types, via the shared dictionary (see @/i18n) - not a second, separately-maintained label map. */
export function statementDocumentTypeLabel(type: StatementDocumentType, locale: Locale = "de"): string {
  const dict = getDictionary(locale).statements;
  const labels: Record<StatementDocumentType, string> = {
    owner_report: dict.ownerReport,
    invoice: dict.invoice,
    credit_note: dict.creditNote,
    other: dict.otherDocument,
  };
  return labels[type];
}

/**
 * Always the document's own original file name (minus ".pdf") - never the
 * generic type label. Necessary because "Umsatz-Reporting" regularly holds
 * TWO owner_report documents in the same month (see StatementMonthGroup),
 * which the generic label alone could never tell apart; the type label is
 * shown once, as that group's section heading, instead (see
 * components/statements/StatementMonthGroup.tsx).
 */
export function statementDocumentDisplayTitle(document: StatementDocument): string {
  return document.title;
}

export interface StatementMonthGroup {
  year: number;
  month: number;
  /** The month's Umsatz-Reporting documents - regularly two, both owner_report, distinguished only by their own file name. */
  ownerReportDocuments: StatementDocument[];
  /** Regularly one Rechnung. */
  invoiceDocuments: StatementDocument[];
  /** Regularly one Gutschrift. */
  creditNoteDocuments: StatementDocument[];
  /** Belege - optional, 0-n. */
  receiptDocuments: StatementDocument[];
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
      const byType = (type: StatementDocumentType) => monthDocuments.filter((doc) => doc.documentType === type);

      return {
        year: monthDocuments[0].year,
        month,
        ownerReportDocuments: byType("owner_report"),
        invoiceDocuments: byType("invoice"),
        creditNoteDocuments: byType("credit_note"),
        receiptDocuments: byType("other").sort((a, b) => a.publishedAt.localeCompare(b.publishedAt)),
        documentCount: monthDocuments.length,
        newCount: monthDocuments.filter(isNewStatementDocument).length,
      };
    });
}

export function statementMonthGroupLabel(group: { year: number; month: number }, locale: Locale = "de"): string {
  return `${monthLabel(group.month, locale)} ${group.year}`;
}
