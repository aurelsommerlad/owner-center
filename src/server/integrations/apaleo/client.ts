import "server-only";
import { getApaleoConfig } from "./config";
import { getApaleoAccessToken } from "./auth";
import { ApaleoError } from "./errors";

/**
 * Thin, central fetch wrapper for the apaleo REST API. Every request goes
 * through here so token attachment and error-kind mapping (auth/not-found/
 * rate-limit/unreachable) happen in exactly one place - no apaleo fetches
 * anywhere else, and never from React components directly.
 *
 * Returns `null` when apaleo answers with a genuinely empty body on an
 * otherwise successful response (observed in production for
 * `/operations/v1/maintenances` when a property has no maintenance windows
 * in the queried range - `response.json()` on an empty body throws
 * `SyntaxError: Unexpected end of JSON input`, which is not a real error,
 * just apaleo's way of saying "nothing here"). Every caller decides what
 * `null` means for its own endpoint (typically "treat as an empty list");
 * TypeScript forces every call site to handle it explicitly rather than
 * letting it silently become `undefined` access deeper in the pipeline.
 */
export async function apaleoRequest<T>(path: string): Promise<T | null> {
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

  // Read as text first: `response.json()` throws on an empty body instead
  // of returning something falsy, and apaleo genuinely sends one for some
  // endpoints (e.g. a 204, or a 200 with no content) when there is simply
  // nothing to return - that is not a parse failure.
  const text = await response.text();
  if (!text.trim()) {
    console.log(
      `[apaleo] empty response body for ${path} (status ${response.status}, content-type: ${
        response.headers.get("content-type") ?? "none"
      }) - treating as no data`
    );
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    // A non-empty body that isn't valid JSON (a gateway/proxy error page, a
    // truncated response) must still surface as a recognized ApaleoError,
    // not an uncaught SyntaxError - every caller only ever catches
    // ApaleoError.
    console.error(`[apaleo] failed to parse JSON response for ${path} (status ${response.status}):`, error);
    throw new ApaleoError("unknown", `apaleo API returned an unparseable response for ${path}`);
  }
}
