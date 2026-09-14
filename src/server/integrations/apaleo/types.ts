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

/**
 * Raw shapes for `/booking/v1/reservations` (expand=timeSlices) and
 * `/operations/v1/maintenances`, grounded against real apaleo test data.
 * Deliberately omits every guest/PII field that the raw payload actually
 * carries (`primaryGuest`, `booker`, `paymentAccount`, ...) - this file only
 * declares the fields this app is ever allowed to read.
 */

export type RawApaleoReservationStatus = "Confirmed" | "InHouse" | "CheckedOut" | "Canceled" | "NoShow";

export interface RawApaleoMoney {
  amount: number;
  currency: string;
}

/** `baseAmount` on a timeSlice - the accommodation-only (no city tax, no extras) per-night charge. */
export interface RawApaleoBaseAmount {
  grossAmount: number;
  netAmount: number;
  currency: string;
}

/** The rate plan apaleo billed a given night/reservation against - `code` is the stable, human-assigned short code (e.g. "STD_DP_OTA", "OWNER"), distinct from `id` (which is property+unit-group-scoped, e.g. "ALPILA-OWNER-TOBL5") and from `name`/`description` (free text, never matched on). */
export interface RawApaleoRatePlanRef {
  id?: string;
  code: string;
}

export interface RawApaleoTimeSlice {
  serviceDate: string;
  unit?: { id: string };
  baseAmount?: RawApaleoBaseAmount;
  ratePlan?: RawApaleoRatePlanRef;
}

export interface RawApaleoReservation {
  id: string;
  status: RawApaleoReservationStatus;
  arrival: string;
  departure: string;
  adults?: number;
  children?: number;
  channelCode?: string;
  source?: string;
  hasCityTax?: boolean;
  unit?: { id: string };
  /** Reservation-level rate plan - grounded against real apaleo data (GET /booking/v1/reservations), always present and, in every real reservation observed, identical to every one of `timeSlices[].ratePlan`. */
  ratePlan?: RawApaleoRatePlanRef;
  timeSlices?: RawApaleoTimeSlice[];
}

export interface RawApaleoReservationListResponse {
  reservations: RawApaleoReservation[];
  count: number;
}

/** Normalized, already PII-free reservation shape this app's server layer works with. */
export interface ApaleoReservationSummary {
  id: string;
  status: RawApaleoReservationStatus;
  unitId: string;
  /** ISO date (yyyy-MM-dd), inclusive - the property-local calendar date apaleo returns. */
  arrivalDate: string;
  /** ISO date (yyyy-MM-dd), exclusive. */
  departureDate: string;
  adults: number | null;
  children: number | null;
  channelCode: string | null;
  source: string | null;
  /** Sum of every timeSlice's `baseAmount.grossAmount` - accommodation only, never city tax/extras. `null` when apaleo returned no timeSlices to sum (never guessed from another field). */
  accommodationGrossAmount: number | null;
  currency: string;
  /** True when the reservation is billed against the "OWNER" rate plan - see reservationService.ts#isOwnerUseReservation for the exact rule and how it's grounded against real apaleo data. */
  isOwnerUse: boolean;
}

export type RawApaleoMaintenanceType = "OutOfService" | "OutOfOrder" | "OutOfInventory";

export interface RawApaleoMaintenance {
  id: string;
  type: RawApaleoMaintenanceType;
  from: string;
  to: string;
  unit?: { id: string };
}

export interface RawApaleoMaintenanceListResponse {
  maintenances: RawApaleoMaintenance[];
  count: number;
}

export interface ApaleoMaintenanceSummary {
  id: string;
  unitId: string;
  /** ISO date (yyyy-MM-dd), inclusive. */
  fromDate: string;
  /** ISO date (yyyy-MM-dd), exclusive. */
  toDate: string;
}
