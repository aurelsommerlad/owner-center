import "server-only";

/**
 * Reads the Google Drive service-account credentials + root folder id from
 * the environment. Server-only, never imported by client code - the
 * private key in particular must never reach the browser bundle.
 */
export interface GoogleDriveConfig {
  serviceAccountEmail: string;
  privateKey: string;
  rootFolderId: string;
}

export function getGoogleDriveConfig(): GoogleDriveConfig | null {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!serviceAccountEmail || !rawPrivateKey || !rootFolderId) return null;

  // Vercel's env var UI stores a multi-line value as a single string with
  // the newlines escaped ("\n" literally, two characters) rather than real
  // line breaks - unescape that here so the PEM key is well-formed for
  // crypto.createSign(). A key that already has real newlines (e.g. from a
  // local .env file) is left untouched, since there's nothing to replace.
  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  return { serviceAccountEmail, privateKey, rootFolderId };
}

export function isGoogleDriveConfigured(): boolean {
  return getGoogleDriveConfig() !== null;
}
