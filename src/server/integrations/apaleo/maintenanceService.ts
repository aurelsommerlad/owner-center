import "server-only";
import { apaleoRequest } from "./client";
import type {
  ApaleoMaintenanceSummary,
  RawApaleoMaintenance,
  RawApaleoMaintenanceListResponse,
} from "./types";

/**
 * Live apaleo maintenance windows (OutOfService/OutOfOrder/OutOfInventory) -
 * the one apaleo resource that unambiguously marks a unit unavailable for a
 * reason other than a guest stay. Rendered as "Blockiert" in the owner
 * calendar/occupancy math.
 *
 * Deliberately NOT used for "Eigennutzung" (owner use): apaleo has no
 * dedicated Owner-Use concept on Maintenance, Block, or Reservation - the
 * `group`/`ratePlan` fields on a Block name a commercial group/rate, never a
 * usage reason - so nothing is guessed from free text. See the ownerPortal
 * layer's reservations.ts for how this is documented to callers.
 */

const PAGE_SIZE = 200;

interface FetchRange {
  /** ISO date (yyyy-MM-dd), inclusive. */
  from: string;
  /** ISO date (yyyy-MM-dd), exclusive. */
  to: string;
}

function toMaintenanceSummary(raw: RawApaleoMaintenance): ApaleoMaintenanceSummary | null {
  const unitId = raw.unit?.id;
  if (!unitId) return null;
  return {
    id: raw.id,
    unitId,
    fromDate: raw.from.slice(0, 10),
    toDate: raw.to.slice(0, 10),
  };
}

export async function listApaleoMaintenancesForProperty(
  apaleoPropertyId: string,
  range: FetchRange
): Promise<ApaleoMaintenanceSummary[]> {
  const results: ApaleoMaintenanceSummary[] = [];
  let pageNumber = 1;
  let fetched = 0;
  let total = Infinity;

  while (fetched < total) {
    const params = new URLSearchParams({
      propertyId: apaleoPropertyId,
      from: `${range.from}T00:00:00Z`,
      to: `${range.to}T00:00:00Z`,
      pageSize: String(PAGE_SIZE),
      pageNumber: String(pageNumber),
    });
    params.append("types", "OutOfService");
    params.append("types", "OutOfOrder");
    params.append("types", "OutOfInventory");

    const data = await apaleoRequest<RawApaleoMaintenanceListResponse>(
      `/operations/v1/maintenances?${params.toString()}`
    );
    total = data.count;
    fetched += data.maintenances.length;

    for (const raw of data.maintenances) {
      const summary = toMaintenanceSummary(raw);
      if (summary) results.push(summary);
    }

    if (data.maintenances.length === 0) break;
    pageNumber += 1;
  }

  return results;
}
