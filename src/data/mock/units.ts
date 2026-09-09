import type { Unit } from "@/types";

export const mockUnits: Unit[] = Array.from({ length: 9 }, (_, index) => {
  const number = index + 1;
  const label = String(number).padStart(2, "0");
  // Vary size/occupancy slightly so the portfolio doesn't feel artificial.
  const isLarger = number % 4 === 0;
  return {
    id: `laeke-${label}`,
    propertyId: "property-laeke",
    name: `LÆKE ${label}`,
    minOccupancy: 2,
    maxOccupancy: isLarger ? 6 : 4,
    sizeSqm: isLarger ? 78 : 52 + (number % 3) * 4,
    imageSeed: `laeke-unit-${label}`,
    sortOrder: number,
  } satisfies Unit;
});
