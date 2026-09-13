import { getIntegrations } from "@/services/admin/integrationService";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminStatusBadge, integrationStatusBadge } from "@/components/admin/AdminStatusBadge";

export default async function AdminIntegrationsPage() {
  const integrations = await getIntegrations();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#171817]">Integrationen</h1>
        <p className="mt-1 text-sm text-[#74736E]">
          Vorbereitete Anbindungen. Noch keine Verbindung, kein OAuth, keine Secrets im Frontend.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {integrations.map((integration) => {
          const badge = integrationStatusBadge(integration.status);
          return (
            <AdminCard key={integration.id} className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-sm font-semibold text-[#171817]">{integration.name}</h2>
                <AdminStatusBadge label={badge.label} tone={badge.tone} />
              </div>
              <p className="mt-2 text-sm text-[#74736E]">{integration.description}</p>

              <div className="mt-4 border-t border-[#E4E0D8] pt-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[#74736E]">Felder später</p>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {integration.upcomingFields.map((field) => (
                    <li key={field} className="flex items-center gap-2 text-sm text-[#171817]">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-[#74736E]" />
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            </AdminCard>
          );
        })}
      </div>
    </div>
  );
}
