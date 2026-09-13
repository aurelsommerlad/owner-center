import type { AdminGeneralDocument } from "@/types/admin";
import { adminGeneralDocuments } from "@/data/admin";

export interface GeneralDocumentFilters {
  propertyId?: string;
  ownerId?: string;
}

export async function getGeneralDocuments(filters: GeneralDocumentFilters = {}): Promise<AdminGeneralDocument[]> {
  return adminGeneralDocuments
    .filter((doc) => !filters.propertyId || doc.propertyId === filters.propertyId)
    .filter((doc) => !filters.ownerId || doc.ownerId === filters.ownerId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Documents still missing a property and/or owner assignment. */
export async function getUnassignedGeneralDocuments(): Promise<AdminGeneralDocument[]> {
  return adminGeneralDocuments.filter((doc) => doc.propertyId === null || doc.ownerId === null);
}
