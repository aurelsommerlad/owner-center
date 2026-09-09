import type { Reservation, ReservationStatus, Unit } from "@/types";
import { addDays, isWeekend, nightsBetween } from "@/lib/dates";

/** Small deterministic PRNG so the mock calendar looks the same on every run/build. */
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(random: () => number, options: Array<[T, number]>): T {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [value, weight] of options) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return options[options.length - 1][0];
}

/** Units that receive one manual owner-use / maintenance block for realism. */
const OWNER_USE_UNIT = "laeke-07";
const MAINTENANCE_UNIT = "laeke-03";

interface GenerateOptions {
  rangeStart: string;
  rangeEndExclusive: string;
}

export function generateMockReservations(
  units: Unit[],
  { rangeStart, rangeEndExclusive }: GenerateOptions
): Reservation[] {
  const reservations: Reservation[] = [];

  units.forEach((unit, unitIndex) => {
    const random = mulberry32(1000 + unitIndex * 97);
    const baseRate = 165 + (unit.maxOccupancy - 4) * 22 + (unit.sortOrder % 3) * 8;

    let cursor = rangeStart;
    let bookingSeq = 1;
    let ownerUsePlaced = false;
    let maintenancePlaced = false;

    while (cursor < rangeEndExclusive) {
      const gapNights = pickWeighted(random, [
        [0, 5],
        [1, 6],
        [2, 4],
        [3, 2],
        [4, 1],
      ]);
      cursor = addDays(cursor, gapNights);
      if (cursor >= rangeEndExclusive) break;

      let status: ReservationStatus = "confirmed";
      let stayLength = pickWeighted(random, [
        [2, 3],
        [3, 5],
        [4, 5],
        [5, 3],
        [6, 2],
        [7, 1],
      ]);

      if (unit.id === OWNER_USE_UNIT && !ownerUsePlaced && cursor > addDays(rangeStart, 10)) {
        status = "owner-use";
        stayLength = 4;
        ownerUsePlaced = true;
      } else if (
        unit.id === MAINTENANCE_UNIT &&
        !maintenancePlaced &&
        cursor > addDays(rangeStart, 6)
      ) {
        status = "blocked";
        stayLength = 1;
        maintenancePlaced = true;
      }

      let checkOut = addDays(cursor, stayLength);
      if (checkOut > rangeEndExclusive) checkOut = rangeEndExclusive;
      const nights = nightsBetween(cursor, checkOut);
      if (nights < 1) break;

      const weekendUplift = isWeekend(cursor) || isWeekend(addDays(checkOut, -1)) ? 1.08 : 1;
      const rate = Math.round(baseRate * weekendUplift);
      const totalAmount = status === "confirmed" ? rate * nights : 0;

      reservations.push({
        id: `${unit.id}-res-${bookingSeq}`,
        internalRef: `APL-${1000 + unitIndex}${String(bookingSeq).padStart(2, "0")}`,
        unitId: unit.id,
        propertyId: unit.propertyId,
        checkIn: cursor,
        checkOut,
        status,
        totalAmount,
        currency: "EUR",
      });

      bookingSeq += 1;
      cursor = checkOut;
    }
  });

  return reservations.sort((a, b) => (a.checkIn < b.checkIn ? -1 : 1));
}

// Re-export for callers that only need date math on a Reservation.
export function reservationNights(reservation: Reservation): number {
  return nightsBetween(reservation.checkIn, reservation.checkOut);
}

export function reservationTouchesDate(reservation: Reservation, iso: string): boolean {
  return iso >= reservation.checkIn && iso < reservation.checkOut;
}
