import type { OwnerDocument } from "@/types";
import { mockDocuments } from "@/data/mock";

export async function getDocumentsForProperty(propertyId: string): Promise<OwnerDocument[]> {
  return mockDocuments.filter((document) => document.propertyId === propertyId);
}
