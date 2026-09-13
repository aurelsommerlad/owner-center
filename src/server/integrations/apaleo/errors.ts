import "server-only";

/**
 * Every failure mode the apaleo layer can surface, kept deliberately small
 * and coarse-grained so the admin UI can show a clear, non-technical German
 * message for each - never a raw stack trace or provider error body.
 */
export type ApaleoErrorKind =
  | "not_configured"
  | "auth_error"
  | "not_found"
  | "rate_limited"
  | "unreachable"
  | "unknown";

export class ApaleoError extends Error {
  readonly kind: ApaleoErrorKind;

  constructor(kind: ApaleoErrorKind, message: string) {
    super(message);
    this.name = "ApaleoError";
    this.kind = kind;
  }
}

/** User-facing (German) message for a caught error - never includes the raw underlying error. */
export function apaleoErrorMessage(kind: ApaleoErrorKind): string {
  switch (kind) {
    case "not_configured":
      return "apaleo ist nicht konfiguriert (APALEO_CLIENT_ID/APALEO_CLIENT_SECRET fehlen).";
    case "auth_error":
      return "Anmeldung bei apaleo fehlgeschlagen. Zugangsdaten prüfen.";
    case "not_found":
      return "Objekt in apaleo nicht gefunden. Property-ID prüfen.";
    case "rate_limited":
      return "apaleo hat die Anfrage aktuell gedrosselt (Rate Limit). Bitte kurz erneut versuchen.";
    case "unreachable":
      return "apaleo ist gerade nicht erreichbar.";
    case "unknown":
      return "Unerwarteter Fehler bei der apaleo-Verbindung.";
  }
}

/** Normalizes any thrown value into a user-facing German message, without ever leaking internals. */
export function describeApaleoError(err: unknown): string {
  if (err instanceof ApaleoError) return apaleoErrorMessage(err.kind);
  return apaleoErrorMessage("unknown");
}
