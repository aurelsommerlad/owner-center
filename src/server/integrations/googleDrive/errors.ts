import "server-only";

/**
 * Every failure mode the Google Drive layer can surface, kept deliberately
 * small and coarse-grained so the admin UI can show a clear, non-technical
 * German message for each - never a raw stack trace or provider error body,
 * and never the service-account private key or an access token.
 */
export type GoogleDriveErrorKind =
  | "not_configured"
  | "auth_error"
  | "not_found"
  | "rate_limited"
  | "unreachable"
  | "unknown";

export class GoogleDriveError extends Error {
  readonly kind: GoogleDriveErrorKind;

  constructor(kind: GoogleDriveErrorKind, message: string) {
    super(message);
    this.name = "GoogleDriveError";
    this.kind = kind;
  }
}

/** User-facing (German) message for a caught error - never includes the raw underlying error, a token, or the private key. */
export function googleDriveErrorMessage(kind: GoogleDriveErrorKind): string {
  switch (kind) {
    case "not_configured":
      return "Google Drive ist nicht konfiguriert (GOOGLE_SERVICE_ACCOUNT_EMAIL/GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY/GOOGLE_DRIVE_ROOT_FOLDER_ID fehlen).";
    case "auth_error":
      return "Anmeldung bei Google Drive fehlgeschlagen. Service-Account-Zugangsdaten prüfen.";
    case "not_found":
      return "Der konfigurierte Root-Ordner wurde in Google Drive nicht gefunden. Ordner-ID prüfen und sicherstellen, dass der Ordner mit dem Service Account geteilt ist.";
    case "rate_limited":
      return "Google Drive hat die Anfrage aktuell gedrosselt (Rate Limit). Bitte kurz erneut versuchen.";
    case "unreachable":
    case "unknown":
      return "Verbindung zu Google Drive konnte nicht hergestellt werden.";
  }
}

/** Normalizes any thrown value into a user-facing German message, without ever leaking internals. */
export function describeGoogleDriveError(err: unknown): string {
  if (err instanceof GoogleDriveError) return googleDriveErrorMessage(err.kind);
  return googleDriveErrorMessage("unknown");
}
