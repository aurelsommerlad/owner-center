import type { Unit } from "@/types";
import { mockUnits } from "@/data/mock";

export async function getUnitsForProperty(propertyId: string): Promise<Unit[]> {
  return mockUnits
    .filter((unit) => unit.propertyId === propertyId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getUnit(unitId: string): Promise<Unit | undefined> {
  return mockUnits.find((unit) => unit.id === unitId);
}
