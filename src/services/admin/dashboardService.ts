import type { AdminGeneralDocument, AdminOwner, AdminProperty } from "@/types/admin";
import { prisma } from "@/server/db";
import { toDateString } from "@/server/mapDate";
import { toAdminOwner, toAdminProperty } from "@/lib/adminPermissions";
import { getUnassignedGeneralDocuments } from "./documentService";
import { countPublishedInMonth } from "./statementService";
import { today } from "@/lib/dates";
import { loadApaleoMappingOverview, mappingStatusFor } from "@/server/integrations/apaleo/mappingStatus";

export interface AdminDashboardHint {
  id: string;
  message: string;
}

export interface AdminApaleoMappingSummary {
  totalProperties: number;
  connectedCount: number;
  openCount: number;
}

export interface AdminDashboardSummary {
  activeOwnersCount: number;
  activePropertiesCount: number;
  publishedThisMonthCount: number;
  unassignedDocumentsCount: number;
  recentOwners: AdminOwner[];
  recentProperties: AdminProperty[];
  recentDocuments: AdminGeneralDocument[];
  hints: AdminDashboardHint[];
  apaleoMapping: AdminApaleoMappingSummary;
}

export async function getDashboardSummary(): Promise<AdminDashboardSummary> {
  const [year, month] = today().split("-").map(Number);

  const [activeOwnersCount, activePropertiesCount, properties, recentOwnerRows, recentDocumentRows, unassignedDocuments, publishedThisMonthCount] =
    await Promise.all([
      prisma.owner.count({ where: { status: "active" } }),
      prisma.property.count({ where: { status: "active" } }),
      prisma.property.findMany({ orderBy: { createdAt: "desc" }, take: 3 }),
      prisma.owner.findMany({ orderBy: { createdAt: "desc" }, take: 3 }),
      prisma.generalDocument.findMany({ orderBy: { createdAt: "desc" }, take: 3 }),
      getUnassignedGeneralDocuments(),
      countPublishedInMonth(year, month),
    ]);

  const hints: AdminDashboardHint[] = [];
  for (const document of unassignedDocuments) {
    hints.push({ id: `doc-${document.id}`, message: `„${document.title}" hat noch keine vollständige Zuordnung.` });
  }
  const allProperties = await prisma.property.findMany();
  const apaleoOverview = await loadApaleoMappingOverview();
  let connectedCount = 0;
  for (const property of allProperties) {
    if (!property.googleDriveFolderId) {
      hints.push({ id: `drive-${property.id}`, message: `${property.name}: fehlender Drive-Ordner.` });
    }
    if (!property.apaleoPropertyId) {
      hints.push({ id: `apaleo-${property.id}`, message: `${property.name}: fehlende apaleo Property-ID.` });
    }
    if (mappingStatusFor(property.apaleoPropertyId, apaleoOverview) === "connected") connectedCount += 1;
  }

  return {
    activeOwnersCount,
    activePropertiesCount,
    publishedThisMonthCount,
    unassignedDocumentsCount: unassignedDocuments.length,
    recentOwners: recentOwnerRows.map(toAdminOwner),
    recentProperties: properties.map(toAdminProperty),
    recentDocuments: recentDocumentRows.map((document) => ({
      id: document.id,
      title: document.title,
      category: document.category as AdminGeneralDocument["category"],
      propertyId: document.propertyId,
      ownerId: document.ownerId,
      fileName: document.fileName,
      status: document.status as AdminGeneralDocument["status"],
      publishedAt: toDateString(document.publishedAt),
      createdAt: toDateString(document.createdAt),
    })),
    hints,
    apaleoMapping: {
      totalProperties: allProperties.length,
      connectedCount,
      openCount: allProperties.length - connectedCount,
    },
  };
}
