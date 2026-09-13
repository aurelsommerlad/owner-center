import type { AdminIntegration } from "@/types/admin";

export const adminIntegrations: AdminIntegration[] = [
  {
    id: "apaleo",
    name: "apaleo",
    status: "not_connected",
    description: "Property-, Einheiten- und Reservierungsdaten direkt aus apaleo übernehmen.",
    upcomingFields: ["Client / Connection", "Property Mapping", "Letzte Synchronisation"],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    status: "not_connected",
    description: "Automatischer Abgleich der Abrechnungs- und Dokumentenordner je Objekt.",
    upcomingFields: ["Root Folder", "Letzte Synchronisation", "Erkannte Dateien"],
  },
];
