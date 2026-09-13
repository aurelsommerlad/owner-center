import type { AdminGeneralDocument } from "@/types/admin";
import { prisma } from "@/server/db";
import { toDateString } from "@/server/mapDate";
import type { GeneralDocument as DbGeneralDocument } from "@/generated/prisma/client";

function toAdminGeneralDocument(document: DbGeneralDocument): AdminGeneralDocument {
  return {
    id: document.id,
    title: document.title,
    category: document.category as AdminGeneralDocument["category"],
    propertyId: document.propertyId,
    ownerId: document.ownerId,
    fileName: document.fileName,
    status: document.status as AdminGeneralDocument["status"],
    publishedAt: toDateString(document.publishedAt),
    createdAt: toDateString(document.createdAt),
  };
}

export interface GeneralDocumentFilters {
  propertyId?: string;
  ownerId?: string;
}

export async function getGeneralDocuments(filters: GeneralDocumentFilters = {}): Promise<AdminGeneralDocument[]> {
  const documents = await prisma.generalDocument.findMany({
    where: {
      propertyId: filters.propertyId,
      ownerId: filters.ownerId,
    },
    orderBy: { createdAt: "desc" },
  });
  return documents.map(toAdminGeneralDocument);
}

/** Documents still missing a property and/or owner assignment. */
export async function getUnassignedGeneralDocuments(): Promise<AdminGeneralDocument[]> {
  const documents = await prisma.generalDocument.findMany({
    where: { OR: [{ propertyId: null }, { ownerId: null }] },
    orderBy: { createdAt: "desc" },
  });
  return documents.map(toAdminGeneralDocument);
}
