import "server-only";

/**
 * Minimal raw shapes for the two apaleo endpoints this layer calls
 * (`/inventory/v1/properties`, `/inventory/v1/units`). Deliberately only the
 * fields this app actually reads - apaleo's real payloads carry many more
 * (billing address, bank account, attributes, ...) that are irrelevant here.
 */

export interface RawApaleoProperty {
  id: string;
  name: string;
  status?: string;
  location?: {
    city?: string;
    countryCode?: string;
  };
}

export interface RawApaleoPropertyListResponse {
  properties: RawApaleoProperty[];
  count: number;
}

export interface RawApaleoUnit {
  id: string;
  name: string;
  unitGroup?: { id: string };
  isArchived?: boolean;
  maxPersons?: number;
}

export interface RawApaleoUnitListResponse {
  units: RawApaleoUnit[];
  count: number;
}

/** Trimmed-down shape this app's admin/test services actually return. */
export interface ApaleoPropertySummary {
  id: string;
  name: string;
  status: string;
  city?: string;
  countryCode?: string;
}

export interface ApaleoUnitSummary {
  id: string;
  name: string;
  unitGroupId?: string;
  isActive: boolean;
  maxPersons?: number;
}
