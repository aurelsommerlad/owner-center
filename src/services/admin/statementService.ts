import type {
  AdminStatementDocument,
  AdminStatementMonthCompleteness,
  AdminStatementMonthGroup,
  AdminStatementStatus,
} from "@/types/admin";
import { prisma } from "@/server/db";
import { toDateString } from "@/server/mapDate";
import type { StatementDocument as DbStatementDocument } from "@/generated/prisma/client";

function toAdminStatementDocument(document: DbStatementDocument): AdminStatementDocument {
  return {
    id: document.id,
    ownerId: document.ownerId ?? undefined,
    propertyId: document.propertyId,
    month: document.month,
    year: document.year,
    documentType: document.documentType as AdminStatementDocument["documentType"],
    title: document.title,
    fileName: document.fileName,
    driveFileId: document.driveFileId,
    driveModifiedAt: toDateString(document.driveModifiedAt),
    version: document.version,
    adminStatus: document.adminStatus as AdminStatementStatus,
    publishedAt: toDateString(document.publishedAt),
    updatedAt: toDateString(document.updatedAt),
    firstViewedAt: toDateString(document.firstViewedAt),
    firstDownloadedAt: toDateString(document.firstDownloadedAt),
    lastDownloadedAt: toDateString(document.lastDownloadedAt),
    downloadCount: document.downloadCount,
  };
}

export async function getStatementDocument(id: string): Promise<AdminStatementDocument | undefined> {
  const document = await prisma.statementDocument.findUnique({ where: { id } });
  return document ? toAdminStatementDocument(document) : undefined;
}

export interface StatementDocumentUpdateInput {
  propertyId?: string;
  year?: number;
  month?: number;
  documentType?: AdminStatementDocument["documentType"];
}

/**
 * The "Prüfen" modal's save action: corrects property/period/type on an
 * existing document. Deliberately never touches driveFileId, driveModifiedAt
 * or adminStatus's publish/archive lifecycle - those are owned by the sync
 * (integrations/googleDrive/documentSync.ts) and the publish/archive actions
 * below, respectively. The one exception: saving out of the "Prüfen" modal
 * resolves "needs_classification" back to "detected" regardless of which
 * type ends up chosen (including a deliberate "other") - going through this
 * review flow IS the admin's classification call the sync itself couldn't
 * make; see publishStatementDocument below for the one place adminStatus,
 * not documentType, is what actually gates publishing.
 */
export async function updateStatementDocumentFields(id: string, input: StatementDocumentUpdateInput): Promise<void> {
  const document = await prisma.statementDocument.findUniqueOrThrow({ where: { id } });
  const resolvesClassification = document.adminStatus === "needs_classification";

  await prisma.statementDocument.update({
    where: { id },
    data: {
      propertyId: input.propertyId,
      year: input.year,
      month: input.month,
      documentType: input.documentType,
      adminStatus: resolvesClassification ? "detected" : undefined,
    },
  });
}

/**
 * Makes a document visible to the owner. Refuses to publish a document still
 * sitting at "needs_classification" - an ambiguous "Rechnung-Gutschrift"
 * file the sync couldn't tell apart, per spec point 10: a unique type must
 * be chosen first (see updateStatementDocumentFields). Deliberately gated on
 * `adminStatus`, not `documentType`: a "Belege" document is ALSO
 * `documentType: "other"` but is never ambiguous (the sync gives it
 * `adminStatus: "detected"` directly - see documentSync.ts) and must be
 * publishable like any other document. Republishing an already-published
 * document (a Drive-side content change) is instead handled by the sync
 * itself, which sets "updated" directly; this function is for the FIRST
 * publish, or for manually re-publishing something an admin had archived.
 */
export async function publishStatementDocument(id: string): Promise<void> {
  const document = await prisma.statementDocument.findUniqueOrThrow({ where: { id } });
  if (document.adminStatus === "needs_classification") {
    throw new Error("Für dieses Dokument muss vor der Veröffentlichung ein eindeutiger Typ (Rechnung/Gutschrift) gewählt werden.");
  }
  const now = new Date();
  const alreadyPublishedBefore = document.publishedAt !== null;
  await prisma.statementDocument.update({
    where: { id },
    data: {
      adminStatus: alreadyPublishedBefore ? "updated" : "published",
      publishedAt: document.publishedAt ?? now,
      updatedAt: alreadyPublishedBefore ? now : document.updatedAt,
    },
  });
}

/** Pulls a document out of the owner-visible set without deleting it - manual archive, or the "Rechnung-Gutschrift" ambiguous case an admin decides not to publish. */
export async function archiveStatementDocument(id: string): Promise<void> {
  await prisma.statementDocument.update({ where: { id }, data: { adminStatus: "archived" } });
}

/**
 * The exactly-2/1/1 shape one statement month is expected to have per the
 * real Drive folder structure (see documentSync.ts): two Umsatz-Reporting
 * PDFs, one Rechnung, one Gutschrift. "Belege" is deliberately not part of
 * this - it's optional (0-n) and never affects completeness.
 */
export const EXPECTED_OWNER_REPORT_DOCUMENT_COUNT = 2;

/**
 * Pure completeness check for one property/month - never itself touches the
 * database, so /admin/statements can compute this from documents it already
 * fetched (see getStatementMonthGroups) without a second query per month. A
 * count that's too LOW or too HIGH is both a deviation worth surfacing (spec
 * point 5: "mehr als 2 Reporting-Dokumente... nicht löschen/ignorieren,
 * sondern... als Abweichung kenntlich machen") - only exactly-2/1/1 (with no
 * file still awaiting classification) counts as "complete".
 */
export function computeMonthCompleteness(counts: {
  ownerReportCount: number;
  invoiceCount: number;
  creditNoteCount: number;
  needsClassificationCount: number;
}): AdminStatementMonthCompleteness {
  const issues: string[] = [];

  if (counts.invoiceCount === 0) issues.push("Rechnung fehlt");
  if (counts.creditNoteCount === 0) issues.push("Gutschrift fehlt");

  if (counts.ownerReportCount === 0) {
    issues.push("Reporting-Dokumente fehlen");
  } else if (counts.ownerReportCount < EXPECTED_OWNER_REPORT_DOCUMENT_COUNT) {
    issues.push(`Nur ${counts.ownerReportCount} von ${EXPECTED_OWNER_REPORT_DOCUMENT_COUNT} Reporting-Dokumenten gefunden`);
  } else if (counts.ownerReportCount > EXPECTED_OWNER_REPORT_DOCUMENT_COUNT) {
    issues.push(`${counts.ownerReportCount} von ${EXPECTED_OWNER_REPORT_DOCUMENT_COUNT} erwarteten Reporting-Dokumenten gefunden`);
  }

  if (counts.needsClassificationCount > 0) {
    issues.push(
      counts.needsClassificationCount === 1
        ? "1 Dokument muss noch klassifiziert werden"
        : `${counts.needsClassificationCount} Dokumente müssen noch klassifiziert werden`
    );
  }

  return { status: issues.length === 0 ? "complete" : "incomplete", issues };
}

function buildMonthGroup(propertyId: string, year: number, month: number, documents: AdminStatementDocument[]): AdminStatementMonthGroup {
  const ownerReportDocuments = documents.filter((doc) => doc.documentType === "owner_report");
  const invoiceDocuments = documents.filter((doc) => doc.documentType === "invoice");
  const creditNoteDocuments = documents.filter((doc) => doc.documentType === "credit_note");
  // Both buckets below share documentType "other" - only adminStatus tells
  // an actual receipt apart from a still-ambiguous Rechnung-Gutschrift file
  // (see documentSync.ts's own doc comment on why there's no separate column).
  const needsClassificationDocuments = documents.filter((doc) => doc.adminStatus === "needs_classification");
  const receiptDocuments = documents.filter((doc) => doc.documentType === "other" && doc.adminStatus !== "needs_classification");

  return {
    propertyId,
    year,
    month,
    ownerReportDocuments,
    invoiceDocuments,
    creditNoteDocuments,
    receiptDocuments,
    needsClassificationDocuments,
    completeness: computeMonthCompleteness({
      ownerReportCount: ownerReportDocuments.length,
      invoiceCount: invoiceDocuments.length,
      creditNoteCount: creditNoteDocuments.length,
      needsClassificationCount: needsClassificationDocuments.length,
    }),
  };
}

/**
 * The central data /admin/statements renders (spec point 6/7): one entry
 * per property/year/month actually present, newest month first, each
 * bucketed into its real Drive categories. Archived documents are excluded
 * entirely - they've been deliberately pulled from the active set (see
 * archiveStatementDocument/documentSync.ts's missing-file handling) and
 * play no further part in a month's current completeness.
 */
export async function getStatementMonthGroups(filters: { propertyId?: string; year?: number } = {}): Promise<AdminStatementMonthGroup[]> {
  const documents = await prisma.statementDocument.findMany({
    where: { propertyId: filters.propertyId, year: filters.year, adminStatus: { not: "archived" } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const byKey = new Map<string, { propertyId: string; year: number; month: number; documents: AdminStatementDocument[] }>();
  for (const document of documents) {
    const mapped = toAdminStatementDocument(document);
    const key = `${mapped.propertyId}__${mapped.year}__${mapped.month}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.documents.push(mapped);
    else byKey.set(key, { propertyId: mapped.propertyId, year: mapped.year, month: mapped.month, documents: [mapped] });
  }

  return Array.from(byKey.values())
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .map(({ propertyId, year, month, documents: monthDocuments }) => buildMonthGroup(propertyId, year, month, monthDocuments));
}

export interface PublishStatementMonthResult {
  publishedCount: number;
  /** Documents still at "needs_classification" - skipped, never silently published (spec point 8). */
  skippedCount: number;
}

/**
 * "Monat veröffentlichen" (spec point 8): publishes every not-yet-visible,
 * classifiable document for one property/month in one go - both Umsatz-
 * Reporting documents, Rechnung, Gutschrift, and any Belege - by reusing
 * publishStatementDocument for each one (so the exact same single-document
 * publish rules apply, including the "updated" vs "published" distinction).
 * Deliberately NOT blocked by an incomplete month (spec point 8: "Wenn
 * Kerndokumente fehlen, Veröffentlichung nicht zwingend technisch
 * blockieren") - the confirmation UI is what surfaces the warning; this
 * function only ever refuses to touch a document still awaiting
 * classification, the one thing that must never be silently published.
 */
export async function publishStatementMonth(propertyId: string, year: number, month: number): Promise<PublishStatementMonthResult> {
  const documents = await prisma.statementDocument.findMany({
    where: { propertyId, year, month, adminStatus: { notIn: ["archived", "published", "updated"] } },
  });

  let publishedCount = 0;
  let skippedCount = 0;
  for (const document of documents) {
    if (document.adminStatus === "needs_classification") {
      skippedCount += 1;
      continue;
    }
    await publishStatementDocument(document.id);
    publishedCount += 1;
  }
  return { publishedCount, skippedCount };
}

/** Years present in the statement archive, newest first - for the year filter. */
export async function getStatementDocumentYears(): Promise<number[]> {
  const documents = await prisma.statementDocument.findMany({
    select: { year: true },
    distinct: ["year"],
  });
  return documents.map((document) => document.year).sort((a, b) => b - a);
}

/** How many documents were actually published during the given month (by publishedAt, not by the statement's own period). */
export async function countPublishedInMonth(year: number, month: number): Promise<number> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1));
  return prisma.statementDocument.count({
    where: { publishedAt: { gte: start, lt: end } },
  });
}
