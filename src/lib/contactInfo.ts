/**
 * The Owner Center's one binding, non-translated contact identity - same in
 * every locale (see i18n/de.ts and en.ts's own `contact` section for the
 * surrounding labels, which ARE translated). Kept here, not duplicated into
 * each dictionary, since an email/phone number isn't language content.
 */
export const CONTACT_INFO = {
  companyDisplayName: "UNIQUE PLACES GmbH",
  email: "team@unique-places.com",
  /** Human-readable, exactly as UNIQUE PLACES specified it for display. */
  phoneDisplay: "+49 8382 5041129",
} as const;

/** `tel:` links must be digits/`+` only, no spaces - derived from `phoneDisplay` rather than a second hand-typed copy, so the two can never drift apart. */
export const CONTACT_PHONE_HREF = `tel:${CONTACT_INFO.phoneDisplay.replace(/\s+/g, "")}`;

export const CONTACT_EMAIL_HREF = `mailto:${CONTACT_INFO.email}`;

/** The two official UNIQUE PLACES legal pages, confirmed by UNIQUE PLACES - never invented. */
export const LEGAL_URLS = {
  legalNotice: "https://unique-places.com/impressum",
  privacyPolicy: "https://unique-places.com/datenschutz",
} as const;
