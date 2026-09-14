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
 * Prepared for later real authentication. Every OwnerUser carries "owner"
 * today - no per-person detail permissions yet (see AdminOwnerUser). No
 * full auth is implemented yet - see lib/adminAuth.ts for the seam a later
 * login system plugs into.
 */
export type UserRole = "admin" | "owner";

export type AccountStatus = "active" | "inactive";

/**
 * AdminOwnerUser-only status: "invited" means the account exists but the
 * person has not yet opened their invitation link and set a password - see
 * OwnerInvitation in prisma/schema.prisma. AdminOwner and OwnerPropertyAccess
 * never have this third state, which is why this is its own type rather
 * than widening AccountStatus itself.
 */
export type OwnerUserAccountStatus = AccountStatus | "invited";

/**
 * The contract partner / owner company. Deliberately not "one person" and
 * deliberately carries no login credentials of its own - see AdminOwnerUser
 * for the individual logins under it (an owner can have several: a
 * managing director, a second contact, later maybe a tax advisor), and
 * OwnerPropertyAccess for the (many-to-many) link to properties.
 */
export interface AdminOwner {
  id: string;
  name: string;
  companyName?: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * An individual person with Owner Center access, belonging to exactly one
 * AdminOwner (an owner can have several such users). This is where email
 * and login-relevant fields live - never on AdminOwner itself.
 */
export interface AdminOwnerUser {
  id: string;
  ownerId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: OwnerUserAccountStatus;
  /** Only set (and only meaningful) while status is "invited" - the most recent invitation's expiry, for the "Eingeladen" vs "Einladung abgelaufen" badge. */
  invitationExpiresAt?: string;
  /** Fixed to "owner" for now - no per-user detail permissions yet. */
  role: "owner";
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Every owner-owned row type that has to be checked before a hard delete
 * (src/services/admin/ownerService.ts#deleteOwnerPermanently) is allowed -
 * any of these being non-zero blocks the delete. `propertyAccessCount`
 * only counts ACTIVE OwnerPropertyAccess rows - a revoked/"inactive" one
 * does not block, since OwnerPropertyAccess.owner is `onDelete: Cascade`
 * (see prisma/schema.prisma): deleting the Owner removes that row either
 * way, so blocking on a merely historical row protects nothing and would
 * only create a dead end (an owner whose access was ever revoked could
 * then never be deleted at all).
 */
export interface OwnerDependencySummary {
  ownerUserCount: number;
  propertyAccessCount: number;
  statementDocumentCount: number;
  generalDocumentCount: number;
}

export type AdminPropertyStatus = "active" | "inactive";

/**
 * The connection/permission record for a property. Reservations, guests,
 * occupancy, units, pricing and availability are NOT modeled here and never
 * will be - those stay apaleo's domain and are fetched from there once that
 * integration exists. Admin only owns the identity + access side.
 */
export interface AdminProperty {
  id: string;
  name: string;
  /** Display location, e.g. "Lindau". */
  location: string;
  status: AdminPropertyStatus;
  /** The leading, admin-entered apaleo property id - see src/server/integrations/apaleo. */
  apaleoPropertyId?: string;
  /** Mock configuration value only - no real Drive connection. */
  statementsDriveFolderId?: string;
  /** Mock configuration value only - no real Drive connection. */
  documentsDriveFolderId?: string;
  /**
   * The real Google Drive mapping: this property's document folder id,
   * always a direct child of the configured root folder - see
   * src/server/integrations/googleDrive/folderService.ts. Admin-entered by
   * picking from a live Drive listing, never freely typed, and re-verified
   * server-side on every save.
   */
  googleDriveFolderId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Many-to-many link between owners and properties: one owner can hold
 * several properties, and (structurally, for later co-ownership /
 * authorized-viewer cases) one property can be linked to several owners.
 * Never collapse this into a single `ownerId` field on Property.
 *
 * `status` lets access be revoked without deleting the record (an audit
 * trail of who was ever granted access to what) - "removing" a property
 * from an owner in the UI sets this to "inactive" rather than deleting the
 * row. Every query in lib/adminPermissions.ts only considers "active" rows.
 */
export interface OwnerPropertyAccess {
  id: string;
  ownerId: string;
  propertyId: string;
  status: AccountStatus;
  createdAt: string;
}

/** The three fachlich defined statement documents, plus "other" for anything further - mirrors the Owner Center's statement archive shape. */
export type AdminDocumentType = "owner_report" | "invoice" | "credit_note" | "other";

/**
 * The admin-side publication lifecycle for a statement document. Separate
 * from (and upstream of) the owner-facing "Neu"/"Gesehen" status: a
 * document only becomes visible to the owner once it reaches "published" or
 * "updated". "draft"/"ready" are the original manual admin-upload states;
 * "detected"/"needs_classification"/"archived" come from the Google Drive
 * sync (see integrations/googleDrive/documentSync.ts) - one shared
 * vocabulary for both flows rather than two parallel status sets.
 */
export type AdminStatementStatus =
  | "draft"
  | "ready"
  | "detected"
  | "needs_classification"
  | "published"
  | "updated"
  | "archived";

export interface AdminStatementDocument {
  id: string;
  /** `undefined` for a Drive-synced document - it belongs to a property, not one owner. See server/permissions.ts#canOwnerAccessProperty for how access is actually derived. */
  ownerId: string | undefined;
  propertyId: string;
  /** 1-12 */
  month: number;
  year: number;
  documentType: AdminDocumentType;
  title: string;
  fileName: string;
  /** Google Drive file id. `null` for a document created through the manual admin flow. */
  driveFileId: string | null;
  /** Drive's own `modifiedTime` for this file as of the last sync. `null` for a manually created document. */
  driveModifiedAt: string | null;
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
