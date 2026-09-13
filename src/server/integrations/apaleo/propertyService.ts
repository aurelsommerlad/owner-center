import "server-only";
import { apaleoRequest } from "./client";
import { ApaleoError } from "./errors";
import type { ApaleoPropertySummary, RawApaleoProperty, RawApaleoPropertyListResponse } from "./types";

/**
 * Admin/test-only reads of apaleo properties. Never used to derive owner
 * access - the internal `Property` table (via `apaleoPropertyId`) stays the
 * leading mapping; this is only for /admin/integrations and the "Mapping
 * prüfen" action on /admin/properties/[id].
 */

function toPropertySummary(raw: RawApaleoProperty): ApaleoPropertySummary {
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status ?? "Unknown",
    city: raw.location?.city,
    countryCode: raw.location?.countryCode,
  };
}

export async function listApaleoProperties(): Promise<ApaleoPropertySummary[]> {
  const data = await apaleoRequest<RawApaleoPropertyListResponse>("/inventory/v1/properties?pageSize=200");
  return data.properties.map(toPropertySummary);
}

/** Returns `null` specifically for "not found" (a bad apaleoPropertyId) - throws on every other failure. */
export async function getApaleoProperty(apaleoPropertyId: string): Promise<ApaleoPropertySummary | null> {
  try {
    const raw = await apaleoRequest<RawApaleoProperty>(
      `/inventory/v1/properties/${encodeURIComponent(apaleoPropertyId)}`,
    );
    return toPropertySummary(raw);
  } catch (err) {
    if (err instanceof ApaleoError && err.kind === "not_found") return null;
    throw err;
  }
}
