import "server-only";
import { APALEO_IDENTITY_TOKEN_URL, getApaleoConfig } from "./config";
import { ApaleoError } from "./errors";

/**
 * OAuth2 client-credentials token handling against apaleo's identity
 * server. Tokens are cached in-memory per server instance (module scope)
 * until shortly before expiry - never persisted, never logged, never
 * returned to a caller outside this module.
 */

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;
const EXPIRY_SAFETY_MARGIN_MS = 30_000;

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export async function getApaleoAccessToken(): Promise<string> {
  const config = getApaleoConfig();
  if (!config) throw new ApaleoError("not_configured", "apaleo credentials are not configured");

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  let response: Response;
  try {
    response = await fetch(APALEO_IDENTITY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
  } catch {
    throw new ApaleoError("unreachable", "apaleo identity server unreachable");
  }

  if (response.status === 401 || response.status === 403) {
    throw new ApaleoError("auth_error", "apaleo rejected the configured client credentials");
  }
  if (!response.ok) {
    throw new ApaleoError("unknown", `apaleo identity server returned ${response.status}`);
  }

  let data: TokenResponse;
  try {
    data = (await response.json()) as TokenResponse;
  } catch (error) {
    console.error("[apaleo] failed to parse identity server token response:", error);
    throw new ApaleoError("unknown", "apaleo identity server returned an unparseable response");
  }
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - EXPIRY_SAFETY_MARGIN_MS,
  };
  return cachedToken.accessToken;
}
