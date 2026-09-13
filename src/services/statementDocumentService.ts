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
    ownerId: document.ownerId,
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

/** Years that have at least one published statement for this property, newest first. */
export async function getStatementDocumentYears(propertyId: string): Promise<number[]> {
  const documents = await prisma.statementDocument.findMany({
    where: { propertyId, adminStatus: { in: ["published", "updated"] } },
    select: { year: true },
    distinct: ["year"],
  });
  return documents.map((document) => document.year).sort((a, b) => b - a);
}
