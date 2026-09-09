import { mockUnits } from "./units";
import { generateMockReservations } from "./generateReservations";

// Covers late August through early October 2026 so the calendar has
// realistic context when navigating a month before/after September,
// while the bulk of bookings sit inside September 2026 as requested.
export const mockReservations = generateMockReservations(mockUnits, {
  rangeStart: "2026-08-24",
  rangeEndExclusive: "2026-10-08",
});
