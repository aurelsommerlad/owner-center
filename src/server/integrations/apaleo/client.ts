import "server-only";
import { getApaleoConfig } from "./config";
import { getApaleoAccessToken } from "./auth";
import { ApaleoError } from "./errors";

/**
 * Thin, central fetch wrapper for the apaleo REST API. Every request goes
 * through here so token attachment and error-kind mapping (auth/not-found/
 * rate-limit/unreachable) happen in exactly one place - no apaleo fetches
 * anywhere else, and never from React components directly.
 */
export async function apaleoRequest<T>(path: string): Promise<T> {
  const config = getApaleoConfig();
  if (!config) throw new ApaleoError("not_configured", "apaleo credentials are not configured");

  const accessToken = await getApaleoAccessToken();

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    throw new ApaleoError("unreachable", "apaleo API unreachable");
  }

  if (response.status === 401 || response.status === 403) {
    throw new ApaleoError("auth_error", "apaleo rejected the request (unauthorized)");
  }
  if (response.status === 404) {
    throw new ApaleoError("not_found", `apaleo resource not found: ${path}`);
  }
  if (response.status === 429) {
    throw new ApaleoError("rate_limited", "apaleo API rate limit exceeded");
  }
  if (!response.ok) {
    throw new ApaleoError("unknown", `apaleo API returned ${response.status} for ${path}`);
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    // An "ok" HTTP status with a body that isn't valid JSON (a gateway/proxy
    // error page, a truncated response, an apaleo response shape this app
    // doesn't expect) must still surface as a recognized ApaleoError, not an
    // uncaught SyntaxError - every caller only ever catches ApaleoError.
    console.error(`[apaleo] failed to parse JSON response for ${path}:`, error);
    throw new ApaleoError("unknown", `apaleo API returned an unparseable response for ${path}`);
  }
}
