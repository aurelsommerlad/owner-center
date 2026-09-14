import type { StatementDocument } from "@/types";
import { prisma } from "@/server/db";
import { toDateString } from "@/server/mapDate";
import type { StatementDocument as DbStatementDocument } from "@/generated/prisma/client";

/**
 * Statement documents for a property/year - a flat list, since a month can
 * hold any number of documents. Group by month with
 * lib/statementDocuments.ts#groupStatementDocumentsByMonth before rendering.
 *
 * Only documents whose admin-side lifecycle has reached "published" or
 * "updated" are ever returned here - a "draft"/"ready" document exists in
 * the database (visible in /admin/statements) but is not yet visible to the
 * owner. Property-level authorization is the caller's responsibility: both
 * call sites (the /abrechnungen page, via propertyService.getProperty) run
 * behind the property layout's canUserAccessProperty check first.
 */

function toStatementDocument(document: DbStatementDocument): StatementDocument {
  return {
    id: document.id,
    ownerId: document.ownerId ?? undefined,
    propertyId: document.propertyId,
    month: document.month,
    year: document.year,
    documentType: document.documentType as StatementDocument["documentType"],
    title: document.title,
    fileName: document.fileName,
    driveFileId: document.driveFileId,
    version: document.version,
    publishedAt: toDateString(document.publishedAt)!,
    updatedAt: toDateString(document.updatedAt),
    firstViewedAt: toDateString(document.firstViewedAt),
    firstDownloadedAt: toDateString(document.firstDownloadedAt),
    lastDownloadedAt: toDateString(document.lastDownloadedAt),
    downloadCount: document.downloadCount,
  };
}

export async function getStatementDocuments(
  propertyId: string,
  year: number
): Promise<StatementDocument[]> {
  const documents = await prisma.statementDocument.findMany({
    where: {
      propertyId,
      year,
      adminStatus: { in: ["published", "updated"] },
    },
    orderBy: { month: "desc" },
  });
  return documents.map(toStatementDocument);
}

/**
 * The documents belonging to the most recently published statement month
 * for this property, across all years - used for the Übersicht page's
 * "Letzte Abrechnung" preview. Empty when nothing has been published yet.
 */
export async function getLatestStatementMonthDocuments(propertyId: string): Promise<StatementDocument[]> {
  const years = await getStatementDocumentYears(propertyId);
  if (years.length === 0) return [];
  const documents = await getStatementDocuments(propertyId, years[0]);
  if (documents.length === 0) return [];
  const newestMonth = documents[0].month;
  return documents.filter((document) => document.month === newestMonth);
}

/** Years that have at least one published statement for this property, newest first. */
export async function getStatementDocumentYears(propertyId: string): Promise<number[]> {
  const documents = await prisma.statementDocument.findMany({
    where: { propertyId, adminStatus: { in: ["published", "updated"] } },
    select: { year: true },
    distinct: ["year"],
  });
  return documents.map((document) => document.year).sort((a, b) => b - a);
}

/**
 * Marks a batch of documents as viewed - "beim ersten Anzeigen des
 * Dokumenteintrags" (spec point 14) is the row in this list actually
 * rendering, since there is no separate per-document detail page. Only sets
 * `firstViewedAt` where it is still null, so it always reflects the FIRST
 * view since the document's last publish/update (a re-publish clears the
 * "Neu" signal by producing a fresh row via `updatedAt`, not by resetting
 * this field - see lib/statementDocuments.ts#isNewStatementDocument).
 */
export async function markStatementDocumentsViewed(documentIds: string[]): Promise<void> {
  if (documentIds.length === 0) return;
  await prisma.statementDocument.updateMany({
    where: { id: { in: documentIds }, firstViewedAt: null },
    data: { firstViewedAt: new Date() },
  });
}
