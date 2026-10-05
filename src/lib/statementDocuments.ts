import type { ComponentType, SVGProps } from "react";
import type { AccountingDocumentDownloadStatus, StatementDocument, StatementDocumentType } from "@/types";
import { monthLabel } from "@/lib/dates";
import { getDictionary, type Locale } from "@/i18n";
import { CreditNoteIcon, DocumentsIcon, ReceiptIcon } from "@/components/ui/icons";

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
 * Per-type icon for a document row - Rechnung and Gutschrift get visually
 * distinct symbols (ReceiptIcon vs its mirrored counterpart CreditNoteIcon)
 * so a month with several of each (e.g. a cancellation that produced an
 * extra Rechnung/Gutschrift pair) stays tellable apart at a glance;
 * Eigentümerreporting/Belege keep the generic document icon.
 */
const DOCUMENT_TYPE_ICON: Record<StatementDocumentType, ComponentType<SVGProps<SVGSVGElement>>> = {
  owner_report: DocumentsIcon,
  invoice: ReceiptIcon,
  credit_note: CreditNoteIcon,
  other: DocumentsIcon,
};

export function statementDocumentIcon(type: StatementDocumentType): ComponentType<SVGProps<SVGSVGElement>> {
  return DOCUMENT_TYPE_ICON[type];
}

/**
 * A technical file name is never shown 1:1 as the owner-facing label - only
 * cosmetic, reversible transforms that never lose information: drop a
 * leading "YYYY-MM" (redundant - the month is already the accordion's own
 * heading), turn "_" into a space, trim. The real `fileName` (and the file
 * streamed on download) is completely untouched - this only ever affects
 * what's rendered here.
 */
function humanizeStatementDocumentTitle(title: string): string {
  return title
    .replace(/^\d{4}-(0[1-9]|1[0-2])[\s_]+/, "")
    .replace(/_/g, " ")
    .trim();
}

/**
 * Always the document's own original file name (humanized for display),
 * never the generic type label. Necessary because "Umsatz-Reporting"
 * regularly holds TWO owner_report documents in the same month (see
 * StatementMonthGroup), which the generic label alone could never tell
 * apart; the type label is shown once, as that group's section heading,
 * instead (see components/statements/StatementMonthAccordion.tsx).
 */
export function statementDocumentDisplayTitle(document: StatementDocument): string {
  return humanizeStatementDocumentTitle(document.title);
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

/**
 * "Vollständig" on the owner side, mirroring (but never importing) the
 * admin's own completeness rule - the owner only ever sees PUBLISHED
 * documents to begin with, so this is a presentation-only readout of
 * exactly that same already-fetched set, not a second data source.
 *
 * Rechnung/Gutschrift only need to be PRESENT (>=1 each), not exactly one -
 * a cancellation can legitimately produce a corrected Rechnung or an extra
 * Gutschrift in the same month, and that's still a complete month, not an
 * incomplete one (mirrors computeMonthCompleteness's own "===0 is the only
 * issue" rule for these two types). Eigentümerreporting stays exactly 2 -
 * that count is never expected to vary, and a deviation there is meant to
 * surface as "Unvollständig" (see EXPECTED_OWNER_REPORT_DOCUMENT_COUNT).
 */
export function statementMonthIsComplete(group: StatementMonthGroup): boolean {
  return group.ownerReportDocuments.length === 2 && group.invoiceDocuments.length >= 1 && group.creditNoteDocuments.length >= 1;
}

export interface StatementMonthProvided {
  date: string;
  /** true when this is an `updatedAt` (a corrected version), false for a first `publishedAt`. */
  wasUpdated: boolean;
}

/** The single most recent provide/update date across a month's documents - for the month summary line ("4 Dokumente · bereitgestellt ..."). `null` only for an empty group, which never actually renders. */
export function statementMonthProvided(group: StatementMonthGroup): StatementMonthProvided | null {
  const allDocuments = [...group.ownerReportDocuments, ...group.invoiceDocuments, ...group.creditNoteDocuments, ...group.receiptDocuments];
  let best: StatementMonthProvided | null = null;
  for (const document of allDocuments) {
    const wasUpdated = document.updatedAt !== null;
    const date = document.updatedAt ?? document.publishedAt;
    if (!best || date > best.date) best = { date, wasUpdated };
  }
  return best;
}

/**
 * One raw accounting-access download event, as read from the
 * StatementDocumentDownload table (see services/
 * statementDownloadTrackingService.ts#getAccountingDownloadEvents, the only
 * producer) - already filtered to accounting-role downloads only, so every
 * function below that consumes this never has to re-check `ownerUserId`'s
 * role itself.
 */
export interface AccountingDownloadEvent {
  documentId: string;
  ownerUserId: string;
  /** ISO datetime. */
  downloadedAt: string;
}

/**
 * Whether (and when) ANY restricted accounting access has downloaded this
 * one document - independent of which access it was, and independent of
 * whether the owner has ever downloaded it themselves (see
 * AccountingDownloadEvent's own doc comment on why an owner's download can
 * never appear in `events` here). Drives the per-document "✓ Buchhaltung ·
 * {date}" line in components/statements/StatementDocumentRow.tsx.
 */
export function computeDocumentAccountingDownloadStatus(
  documentId: string,
  events: AccountingDownloadEvent[]
): AccountingDocumentDownloadStatus {
  let lastDownloadedAt: string | undefined;
  for (const event of events) {
    if (event.documentId !== documentId) continue;
    if (!lastDownloadedAt || event.downloadedAt > lastDownloadedAt) lastDownloadedAt = event.downloadedAt;
  }
  return lastDownloadedAt ? { downloaded: true, lastDownloadedAt } : { downloaded: false };
}

/**
 * Whether a month's statement is "abgeholt" by the accounting side - true
 * exactly when ONE SINGLE currently-authorized accounting access has
 * downloaded every one of this month's CORE documents (2x Eigentümer-
 * reporting + >=1 Rechnung + >=1 Gutschrift, the same set
 * statementMonthIsComplete already checks "Vollständig" against -
 * deliberately excluding optional Belege, which must never block this
 * status). Several different accounting accesses each downloading a
 * different subset does NOT count - the spec asks for "ein... Accounting-
 * User [der] alle Kerndokumente heruntergeladen hat", one person with the
 * complete set, not the group collectively. When that set is empty (no core
 * documents published yet), this is always `false` - `Array.every` on an
 * empty required-id list would otherwise vacuously say "downloaded" for a
 * month with nothing to download yet.
 *
 * The one place this rule is computed - components only ever render the
 * boolean/date this returns, never recompute it themselves (see
 * components/statements/StatementMonthAccordion.tsx).
 */
export function computeMonthAccountingDownloadStatus(
  group: StatementMonthGroup,
  events: AccountingDownloadEvent[]
): AccountingDocumentDownloadStatus {
  const coreDocumentIds = [...group.ownerReportDocuments, ...group.invoiceDocuments, ...group.creditNoteDocuments].map(
    (document) => document.id
  );
  if (coreDocumentIds.length === 0) return { downloaded: false };

  const downloadedIdsByUser = new Map<string, Set<string>>();
  const lastDownloadAtByUser = new Map<string, string>();
  for (const event of events) {
    if (!coreDocumentIds.includes(event.documentId)) continue;
    const ids = downloadedIdsByUser.get(event.ownerUserId) ?? new Set<string>();
    ids.add(event.documentId);
    downloadedIdsByUser.set(event.ownerUserId, ids);
    const previousLast = lastDownloadAtByUser.get(event.ownerUserId);
    if (!previousLast || event.downloadedAt > previousLast) lastDownloadAtByUser.set(event.ownerUserId, event.downloadedAt);
  }

  let bestCompletionAt: string | undefined;
  for (const [ownerUserId, ids] of downloadedIdsByUser) {
    const hasAllCoreDocuments = coreDocumentIds.every((id) => ids.has(id));
    if (!hasAllCoreDocuments) continue;
    const completedAt = lastDownloadAtByUser.get(ownerUserId)!;
    if (!bestCompletionAt || completedAt > bestCompletionAt) bestCompletionAt = completedAt;
  }

  return bestCompletionAt ? { downloaded: true, lastDownloadedAt: bestCompletionAt } : { downloaded: false };
}
