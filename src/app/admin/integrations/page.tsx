import { getIntegrations } from "@/services/admin/integrationService";
import { Card } from "@/components/ui/Card";
import { AdminStatusBadge, integrationStatusBadge } from "@/components/admin/AdminStatusBadge";

export default async function AdminIntegrationsPage() {
  const integrations = await getIntegrations();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Integrationen</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Vorbereitete Anbindungen. Noch keine Verbindung, kein OAuth, keine Secrets im Frontend.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {integrations.map((integration) => {
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
