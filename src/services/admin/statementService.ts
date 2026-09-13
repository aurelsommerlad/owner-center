import type { AdminStatementDocument, AdminStatementStatus } from "@/types/admin";
import { prisma } from "@/server/db";
import { toDateString } from "@/server/mapDate";
import type { StatementDocument as DbStatementDocument } from "@/generated/prisma/client";

function toAdminStatementDocument(document: DbStatementDocument): AdminStatementDocument {
  return {
    id: document.id,
    ownerId: document.ownerId,
    propertyId: document.propertyId,
    month: document.month,
    year: document.year,
    documentType: document.documentType as AdminStatementDocument["documentType"],
    title: document.title,
    fileName: document.fileName,
    driveFileId: document.driveFileId,
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

export interface StatementDocumentFilters {
  propertyId?: string;
  year?: number;
  month?: number;
  status?: AdminStatementStatus;
}

export async function getStatementDocuments(filters: StatementDocumentFilters = {}): Promise<AdminStatementDocument[]> {
  const documents = await prisma.statementDocument.findMany({
    where: {
      propertyId: filters.propertyId,
      year: filters.year,
      month: filters.month,
      adminStatus: filters.status,
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return documents.map(toAdminStatementDocument);
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
