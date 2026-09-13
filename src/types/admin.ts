/**
 * Domain types for the UNIQUE PLACES internal admin area (/admin).
 *
 * Deliberately its own module, separate from `@/types` (the investor-facing
 * Owner Center domain): the admin area is not a second PMS, and keeping the
 * two type graphs apart means a change on one side can never silently
 * ripple into the other. Admin components/services only ever import from
 * `@/types/admin`; Owner Center components only ever import from `@/types`.
 */

/**
 * Prepared for later real authentication. "owner" is the company/account
 * level, "owner_user" an individual login under an owner (an owner can have
 * several). No full auth is implemented yet - see lib/adminAuth.ts for the
 * seam a later login system plugs into.
 */
export type UserRole = "admin" | "owner" | "owner_user";

export type AccountStatus = "active" | "inactive";

/**
 * The company/account that owns one or more properties. Deliberately not
 * "one person" - see AdminOwnerUser for the individual logins under it, and
 * OwnerPropertyAccess for the (many-to-many) link to properties.
 */
export interface AdminOwner {
  id: string;
  /** Primary contact / display name, e.g. "Familie Schneider". */
  name: string;
  company: string;
  email: string;
  status: AccountStatus;
  /** Account-level role. Individual AdminOwnerUser entries may carry a different role (e.g. "owner_user" for a secondary login). */
  role: UserRole;
  createdAt: string;
  /** Most recent login across all of this owner's users, if any. */
  lastLoginAt: string | null;
}

/** An individual person/login belonging to an AdminOwner. An owner can have several. */
export interface AdminOwnerUser {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  lastLoginAt: string | null;
}

export type AdminPropertyStatus = "active" | "inactive" | "onboarding";

export interface AdminProperty {
  id: string;
  name: string;
  /** Display location, e.g. "Lindau · Bodensee". */
  location: string;
  status: AdminPropertyStatus;
  /** `null` until the property is linked in apaleo. */
  apaleoPropertyId: string | null;
  /** `null` until a Drive folder has been set up for this property's statements. */
  statementsDriveFolderId: string | null;
  /** `null` until a Drive folder has been set up for this property's general documents. */
  documentsDriveFolderId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Many-to-many link between owners and properties: one owner can hold
 * several properties, and (structurally, for later co-ownership /
 * authorized-viewer cases) one property can be linked to several owners.
 * Never collapse this into a single `ownerId` field on Property.
 */
export interface OwnerPropertyAccess {
  id: string;
  ownerId: string;
  propertyId: string;
  createdAt: string;
}

/** The three fachlich defined statement documents, plus "other" for anything further - mirrors the Owner Center's statement archive shape. */
export type AdminDocumentType = "owner_report" | "invoice" | "credit_note" | "other";

/**
 * The admin-side publication lifecycle for a statement document. Separate
 * from (and upstream of) the owner-facing "Neu"/"Gesehen" status: a
 * document only becomes visible to the owner once it reaches "published".
 */
export type AdminStatementStatus = "draft" | "ready" | "published" | "updated";

export interface AdminStatementDocument {
  id: string;
  ownerId: string;
  propertyId: string;
  /** 1-12 */
  month: number;
  year: number;
  documentType: AdminDocumentType;
  title: string;
  fileName: string;
  /** Google Drive file id. `null` until the Drive integration is wired up. */
  driveFileId: string | null;
  version: number;
  adminStatus: AdminStatementStatus;
  /** `null` while still a draft/not yet made available to the owner. */
  publishedAt: string | null;
  updatedAt: string | null;
  firstViewedAt: string | null;
  firstDownloadedAt: string | null;
  lastDownloadedAt: string | null;
  downloadCount: number;
}

/** General documents outside the monthly statement cycle (contracts, tax papers, ...). */
export type AdminGeneralDocumentCategory =
  | "vertrag"
  | "steuerunterlage"
  | "objektunterlage"
  | "versicherung"
  | "sonstiges";

export type AdminGeneralDocumentStatus = "draft" | "published";

export interface AdminGeneralDocument {
  id: string;
  title: string;
  category: AdminGeneralDocumentCategory;
  /** `null` = not yet assigned to a property. */
  propertyId: string | null;
  /** `null` = not yet assigned to an owner. */
  ownerId: string | null;
  fileName: string;
  status: AdminGeneralDocumentStatus;
  publishedAt: string | null;
  createdAt: string;
}

export type IntegrationStatus = "not_connected" | "connected" | "error";

/**
 * A future external integration, shown as a status card only - no OAuth
 * flow, no secrets, no live connection. `upcomingFields` is the list of
 * fields this card will show once the integration is real.
 */
export interface AdminIntegration {
  id: string;
  name: string;
  status: IntegrationStatus;
  description: string;
  upcomingFields: string[];
}
