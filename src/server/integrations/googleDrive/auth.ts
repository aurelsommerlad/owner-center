import "server-only";
import { createSign } from "node:crypto";
import { getGoogleDriveConfig } from "./config";
import { GoogleDriveError } from "./errors";

/**
 * Google service-account OAuth2 (Server-to-Server / JWT-bearer flow):
 * https://developers.google.com/identity/protocols/oauth2/service-account#httprest
 * Signed with Node's built-in `crypto` instead of pulling in
 * `google-auth-library`/`googleapis`, matching this codebase's apaleo
 * integration (plain `fetch`, zero extra dependencies) - a service-account
 * JWT assertion is exactly one RS256-signed token, nothing an SDK is
 * actually needed for.
 *
 * `drive.readonly` is deliberately the only scope requested: this step only
 * ever reads folder/file metadata to prove the connection works (see
 * driveService.ts) - no upload/delete/share capability is requested, and no
 * file content is downloaded.
 */
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const EXPIRY_SAFETY_MARGIN_MS = 30_000;
const ASSERTION_LIFETIME_SECONDS = 3600;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function signAssertion(serviceAccountEmail: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: serviceAccountEmail,
    scope: GOOGLE_DRIVE_READONLY_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + ASSERTION_LIFETIME_SECONDS,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey).toString("base64url");

  return `${unsigned}.${signature}`;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export async function getGoogleDriveAccessToken(): Promise<string> {
  const config = getGoogleDriveConfig();
  if (!config) throw new GoogleDriveError("not_configured", "Google Drive credentials are not configured");

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  let assertion: string;
  try {
    assertion = signAssertion(config.serviceAccountEmail, config.privateKey);
  } catch (error) {
    console.error("[googleDrive] failed to sign the service-account assertion (check GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY format):", error);
    throw new GoogleDriveError("auth_error", "failed to sign the Google service-account assertion");
  }

  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }).toString(),
      cache: "no-store",
    });
  } catch {
    throw new GoogleDriveError("unreachable", "Google token endpoint unreachable");
  }

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new GoogleDriveError("auth_error", "Google rejected the configured service-account credentials");
  }
  if (!response.ok) {
    throw new GoogleDriveError("unknown", `Google token endpoint returned ${response.status}`);
  }

  let data: TokenResponse;
  try {
    data = (await response.json()) as TokenResponse;
  } catch (error) {
    console.error("[googleDrive] failed to parse token endpoint response:", error);
    throw new GoogleDriveError("unknown", "Google token endpoint returned an unparseable response");
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - EXPIRY_SAFETY_MARGIN_MS,
  };
  return cachedToken.accessToken;
}
