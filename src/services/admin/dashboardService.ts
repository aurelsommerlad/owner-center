import type { AdminGeneralDocument, AdminOwner, AdminProperty } from "@/types/admin";
import { adminGeneralDocuments, adminOwners, adminProperties } from "@/data/admin";
import { getUnassignedGeneralDocuments } from "./documentService";
import { countPublishedInMonth } from "./statementService";
import { MOCK_TODAY } from "@/lib/config";

export interface AdminDashboardHint {
  id: string;
  message: string;
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
}

function byRecency<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getDashboardSummary(): Promise<AdminDashboardSummary> {
  const [year, month] = MOCK_TODAY.split("-").map(Number);

  const unassignedDocuments = await getUnassignedGeneralDocuments();
  const publishedThisMonthCount = await countPublishedInMonth(year, month);

  const hints: AdminDashboardHint[] = [];
  for (const document of unassignedDocuments) {
    hints.push({ id: `doc-${document.id}`, message: `„${document.title}" hat noch keine vollständige Zuordnung.` });
  }
  for (const property of adminProperties) {
    if (!property.statementsDriveFolderId || !property.documentsDriveFolderId) {
      hints.push({ id: `drive-${property.id}`, message: `${property.name}: fehlender Drive-Ordner.` });
    }
    if (!property.apaleoPropertyId) {
      hints.push({ id: `apaleo-${property.id}`, message: `${property.name}: fehlende apaleo Property-ID.` });
    }
  }

  return {
    activeOwnersCount: adminOwners.filter((owner) => owner.status === "active").length,
    activePropertiesCount: adminProperties.filter((property) => property.status === "active").length,
    publishedThisMonthCount,
    unassignedDocumentsCount: unassignedDocuments.length,
    recentOwners: byRecency(adminOwners).slice(0, 3),
    recentProperties: byRecency(adminProperties).slice(0, 3),
    recentDocuments: byRecency(adminGeneralDocuments).slice(0, 3),
    hints,
  };
}
