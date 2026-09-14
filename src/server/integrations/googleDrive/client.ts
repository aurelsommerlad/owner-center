import "server-only";
import { getGoogleDriveConfig } from "./config";
import { getGoogleDriveAccessToken } from "./auth";
import { GoogleDriveError } from "./errors";

const GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

/**
 * Thin, central fetch wrapper for the Google Drive REST API. Every request
 * goes through here so token attachment and error-kind mapping happen in
 * exactly one place - no Drive fetches anywhere else, and never from React
 * components directly. Mirrors src/server/integrations/apaleo/client.ts.
 */
export async function googleDriveRequest<T>(path: string): Promise<T | null> {
  const config = getGoogleDriveConfig();
  if (!config) throw new GoogleDriveError("not_configured", "Google Drive credentials are not configured");

  const accessToken = await getGoogleDriveAccessToken();

  let response: Response;
  try {
    response = await fetch(`${GOOGLE_DRIVE_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    throw new GoogleDriveError("unreachable", "Google Drive API unreachable");
  }

  if (response.status === 401 || response.status === 403) {
    throw new GoogleDriveError("auth_error", "Google Drive rejected the request (unauthorized)");
  }
  // Drive returns 404 both for a genuinely missing file id AND for a file
  // the service account has no access to (rather than 403), to avoid
  // leaking whether a file exists to a caller without permission - see
  // errors.ts's "not_found" message, which covers both cases for admins.
  if (response.status === 404) {
    throw new GoogleDriveError("not_found", `Google Drive resource not found: ${path}`);
  }
  if (response.status === 429) {
    throw new GoogleDriveError("rate_limited", "Google Drive API rate limit exceeded");
  }
  if (!response.ok) {
    throw new GoogleDriveError("unknown", `Google Drive API returned ${response.status} for ${path}`);
  }

  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error(`[googleDrive] failed to parse JSON response for ${path}:`, error);
    throw new GoogleDriveError("unknown", `Google Drive API returned an unparseable response for ${path}`);
  }
}

/**
 * Fetches a file's raw bytes (`alt=media`) for the protected download route
 * (see app/api/documents/[id]/download/route.ts) - the one place this
 * integration ever reads file CONTENT, always streamed straight through to
 * the browser rather than buffered or cached server-side. Returns the raw
 * Response (not JSON-parsed, unlike googleDriveRequest above) so the caller
 * can stream `response.body` directly and read `content-length`/`content-type`
 * off the real headers.
 */
export async function googleDriveDownloadRequest(fileId: string): Promise<Response> {
  const config = getGoogleDriveConfig();
  if (!config) throw new GoogleDriveError("not_configured", "Google Drive credentials are not configured");

  const accessToken = await getGoogleDriveAccessToken();

  let response: Response;
  try {
    response = await fetch(
      `${GOOGLE_DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    );
  } catch {
    throw new GoogleDriveError("unreachable", "Google Drive API unreachable");
  }

  if (response.status === 401 || response.status === 403) {
    throw new GoogleDriveError("auth_error", "Google Drive rejected the request (unauthorized)");
  }
  if (response.status === 404) {
    throw new GoogleDriveError("not_found", `Google Drive file not found: ${fileId}`);
  }
  if (response.status === 429) {
    throw new GoogleDriveError("rate_limited", "Google Drive API rate limit exceeded");
  }
  if (!response.ok) {
    throw new GoogleDriveError("unknown", `Google Drive API returned ${response.status} for file ${fileId}`);
  }

  return response;
}
