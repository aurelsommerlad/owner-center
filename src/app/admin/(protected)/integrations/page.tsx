import { getIntegrations } from "@/services/admin/integrationService";
import { getProperties } from "@/services/admin/propertyService";
import { Card } from "@/components/ui/Card";
import { AdminStatusBadge, integrationStatusBadge } from "@/components/admin/AdminStatusBadge";
import { ApaleoIntegrationCard, type ApaleoMappingStats } from "@/components/admin/ApaleoIntegrationCard";
import { getApaleoConnectionStatus } from "@/server/integrations/apaleo/connectionCheck";
import { loadApaleoMappingOverview, mappingStatusFor } from "@/server/integrations/apaleo/mappingStatus";

export default async function AdminIntegrationsPage() {
  const [integrations, apaleoStatus, apaleoOverview, internalProperties] = await Promise.all([
    getIntegrations(),
    getApaleoConnectionStatus(),
    loadApaleoMappingOverview(),
    getProperties(),
  ]);
  // apaleo is real/functional now (see below) - only the still-mock
  // integrations (Google Drive) go through the generic status-card loop.
  const otherIntegrations = integrations.filter((integration) => integration.id !== "apaleo");

  const mappedCount = internalProperties.filter(
    (property) => mappingStatusFor(property.apaleoPropertyId, apaleoOverview) === "connected"
  ).length;
  const mappingStats: ApaleoMappingStats | null = apaleoOverview.available
    ? {
        apaleoPropertiesCount: apaleoOverview.apaleoProperties.length,
        internalPropertiesCount: internalProperties.length,
        mappedCount,
        openCount: internalProperties.length - mappedCount,
      }
    : null;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Integrationen</h1>
        <p className="mt-1 text-sm text-ink-soft">
          apaleo ist als Connection Layer angebunden. Weitere Anbindungen sind vorbereitet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ApaleoIntegrationCard
          configured={apaleoStatus.configured}
          lastCheck={apaleoStatus.lastCheck}
          mappingStats={mappingStats}
        />
        {otherIntegrations.map((integration) => {
          const badge = integrationStatusBadge(integration.status);
          return (
            <Card key={integration.id} className="p-5 shadow-soft sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">{integration.name}</h2>
                <AdminStatusBadge label={badge.label} tone={badge.tone} />
              </div>
              <p className="mt-2 text-sm text-ink-soft">{integration.description}</p>

              <div className="mt-4 border-t border-line pt-4">
                <p className="text-[11px] uppercase tracking-[0.08em] text-ink-soft">Felder später</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {integration.upcomingFields.map((field) => (
                    <li key={field} className="flex items-center gap-2 text-sm text-ink">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-ink/25" />
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
