import type { AdminStatementDocument, AdminStatementStatus } from "@/types/admin";
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

/** The three coarse tabs on /admin/statements - "needs_review" covers both pre-publish Drive-sync states at once. */
export type StatementDocumentView = "all" | "needs_review" | "published";

const VIEW_STATUSES: Record<Exclude<StatementDocumentView, "all">, AdminStatementStatus[]> = {
  needs_review: ["detected", "needs_classification"],
  published: ["published", "updated"],
};

export interface StatementDocumentFilters {
  propertyId?: string;
  year?: number;
  month?: number;
  status?: AdminStatementStatus;
  /** Coarse tab filter, combined with `status` if both are given. */
  view?: StatementDocumentView;
}

export async function getStatementDocuments(filters: StatementDocumentFilters = {}): Promise<AdminStatementDocument[]> {
  const documents = await prisma.statementDocument.findMany({
    where: {
      propertyId: filters.propertyId,
      year: filters.year,
      month: filters.month,
      adminStatus: filters.status ?? (filters.view && filters.view !== "all" ? { in: VIEW_STATUSES[filters.view] } : undefined),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return documents.map(toAdminStatementDocument);
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
 * below, respectively. The one exception: picking a real type resolves
 * "needs_classification" back to "detected", since the admin has now made
 * the call the sync couldn't.
 */
export async function updateStatementDocumentFields(id: string, input: StatementDocumentUpdateInput): Promise<void> {
  const document = await prisma.statementDocument.findUniqueOrThrow({ where: { id } });
  const nextType = input.documentType ?? document.documentType;
  const resolvesClassification = document.adminStatus === "needs_classification" && nextType !== "other";

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
 * Makes a document visible to the owner. Refuses to publish a
 * "Rechnung-Gutschrift" document still sitting at "other"/needs_classification
 * - see spec point 10: a unique type must be chosen first. Republishing an
 * already-published document (a Drive-side content change - see
 * documentSync.ts) is instead handled by the sync itself, which sets
 * "updated" directly; this function is for the FIRST publish, or for
 * manually re-publishing something an admin had archived.
 */
export async function publishStatementDocument(id: string): Promise<void> {
  const document = await prisma.statementDocument.findUniqueOrThrow({ where: { id } });
  if (document.documentType === "other") {
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
