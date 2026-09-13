import "server-only";
import { isApaleoConfigured } from "./config";
import { listApaleoProperties } from "./propertyService";
import { describeApaleoError } from "./errors";
import type { ApaleoPropertySummary } from "./types";

/**
 * The internal Property.apaleoPropertyId <-> live apaleo property mapping
 * state, computed once per page render (a single `listApaleoProperties()`
 * call) rather than one apaleo request per row - every admin page that
 * needs to show mapping status (properties list/detail, owner detail,
 * dashboard, integrations) shares this one loader.
 */
export interface ApaleoMappingOverview {
  /** false when apaleo is unconfigured or unreachable this render - never treated as "mapping fehlerhaft". */
  available: boolean;
  errorMessage: string | null;
  apaleoProperties: ApaleoPropertySummary[];
  byId: Map<string, ApaleoPropertySummary>;
}

export async function loadApaleoMappingOverview(): Promise<ApaleoMappingOverview> {
  if (!isApaleoConfigured()) {
    return {
      available: false,
      errorMessage: "apaleo ist nicht konfiguriert.",
      apaleoProperties: [],
      byId: new Map(),
    };
  }

  try {
    const apaleoProperties = await listApaleoProperties();
    return {
      available: true,
      errorMessage: null,
      apaleoProperties,
      byId: new Map(apaleoProperties.map((property) => [property.id, property])),
    };
  } catch (err) {
    return {
      available: false,
      errorMessage: describeApaleoError(err),
      apaleoProperties: [],
      byId: new Map(),
    };
  }
}

export type ApaleoMappingStatus = "connected" | "not_connected" | "mapping_error" | "unavailable";

/**
 * The mapping status for one internal property, given an already-loaded
 * overview. `mapping_error` only ever fires when apaleo WAS reachable and
 * the id simply isn't there (a stale/bad id) - never confused with apaleo
 * being temporarily unreachable, which is `unavailable`.
 */
export function mappingStatusFor(
  apaleoPropertyId: string | null | undefined,
  overview: ApaleoMappingOverview,
): ApaleoMappingStatus {
  if (!apaleoPropertyId) return "not_connected";
  if (!overview.available) return "unavailable";
  return overview.byId.has(apaleoPropertyId) ? "connected" : "mapping_error";
}
