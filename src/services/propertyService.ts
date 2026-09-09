import type { Property } from "@/types";
import { mockProperties } from "@/data/mock";

export async function getPropertiesForOwner(ownerId: string): Promise<Property[]> {
  return mockProperties.filter((property) => property.ownerId === ownerId);
}

export async function getProperty(propertyId: string): Promise<Property | undefined> {
  return mockProperties.find((property) => property.id === propertyId);
}
