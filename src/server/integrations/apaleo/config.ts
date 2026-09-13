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
