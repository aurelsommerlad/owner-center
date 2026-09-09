import type { Reservation } from "@/types";
import { mockReservations } from "@/data/mock";
import type { DateRange } from "@/lib/occupancy";
import { reservationsInRange } from "@/lib/occupancy";

export async function getReservationsForProperty(
  propertyId: string,
  range?: DateRange
): Promise<Reservation[]> {
  if (!range) {
    return mockReservations.filter((reservation) => reservation.propertyId === propertyId);
  }
  return reservationsInRange(mockReservations, propertyId, range);
}
