/**
 * The single user-facing version string shown to owners (currently only on
 * the Kontakt/Contact page, "Über das Owner Center"/"About the Owner
 * Center") - deliberately NOT package.json's version (that's an internal
 * npm/dev artifact that changes independently) and never a commit hash or
 * build id, which would be a technical/integration detail no owner needs to
 * see. Bump this by hand when a release is worth surfacing to owners.
 */
export const APP_VERSION = "1.0";
