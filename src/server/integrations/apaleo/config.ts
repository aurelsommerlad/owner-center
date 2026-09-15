import "server-only";

/**
 * Reads the three apaleo credentials from the environment. Server-only,
 * never imported by client code - `APALEO_CLIENT_SECRET` in particular must
 * never reach the browser bundle.
 *
 * apaleo's identity server is a fixed, well-known host (not configurable
 * per integration) - only the API base URL varies (e.g. between apaleo's
 * production API and a future sandbox/mock target), which is why only that
 * one is read from `APALEO_BASE_URL`.
 */
export const APALEO_IDENTITY_TOKEN_URL = "https://identity.apaleo.com/connect/token";
const DEFAULT_APALEO_BASE_URL = "https://api.apaleo.com";

export interface ApaleoConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

export function getApaleoConfig(): ApaleoConfig | null {
  const clientId = process.env.APALEO_CLIENT_ID;
  const clientSecret = process.env.APALEO_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const baseUrl = (process.env.APALEO_BASE_URL || DEFAULT_APALEO_BASE_URL).replace(/\/+$/, "");
  return { clientId, clientSecret, baseUrl };
}

export function isApaleoConfigured(): boolean {
  return getApaleoConfig() !== null;
}

/**
 * The single, central gate every owner-facing mock-data fallback (V1
 * reservation/unit/statistics fixtures, the MOCK_TODAY anchor) must check -
 * never `!isApaleoConfigured()` alone. True only in local development
 * without apaleo credentials; always false once `NODE_ENV === "production"`,
 * regardless of configuration state, so a broken/missing production
 * configuration can never silently substitute mock data for a real owner.
 * When this is false and apaleo also isn't configured, callers must fall
 * through to their existing controlled data-error state (see
 * server/services/ownerPortal/errorState.ts) instead of the mock branch -
 * see logApaleoNotConfiguredInProduction below for the matching server log.
 */
export function isMockFallbackAllowed(): boolean {
  return !isApaleoConfigured() && process.env.NODE_ENV !== "production";
}

/**
 * Logs the one case `isMockFallbackAllowed()` exists to prevent: apaleo
 * genuinely unconfigured while running in production. Server-side only
 * (Vercel function logs), names the missing env vars but never a value -
 * never shown to an owner, who only ever sees the caller's existing
 * "Daten konnten aktuell nicht geladen werden." notice.
 */
export function logApaleoNotConfiguredInProduction(context: string): void {
  console.error(
    `[apaleo] not configured in production (${context}) - set APALEO_CLIENT_ID and APALEO_CLIENT_SECRET; refusing to fall back to mock data`
  );
}
