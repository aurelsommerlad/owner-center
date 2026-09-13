import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { prisma } from "@/server/db";
import { adminAccountExistsForRouting } from "@/server/adminBootstrapCore";
import { Card } from "@/components/ui/Card";
import { AdminSetupForm } from "./AdminSetupForm";

/**
 * The one-time, unauthenticated first-run admin setup. Reachable only
 * while zero admin accounts exist - checked server-side on every request,
 * here AND independently in setupAdminAction, so this page (and the action
 * behind it) permanently and unconditionally disappears the moment the
 * first admin is created, via whichever path created it. No token, no
 * environment variable, no terminal needed: the database itself is the
 * only gate.
 *
 * `force-dynamic` is required, not optional: the admin-exists check below
 * runs (and can redirect) before any `cookies()` call, so Next.js's static
 * analysis cannot infer on its own that this page depends on live,
 * per-request database state - without this it would be prerendered once
 * at build time and that stale result served to every visitor afterward.
 */
export const dynamic = "force-dynamic";
export default async function AdminSetupPage() {
  if (await adminAccountExistsForRouting(prisma)) {
    const session = await getSession();
    redirect(session?.role === "admin" ? "/admin" : "/admin/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-sans text-sm font-semibold tracking-[0.05em] text-ink">UNIQUE PLACES</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft">Admin</p>
        </div>

        <Card className="p-6 shadow-soft-lg sm:p-8">
          <h1 className="font-display text-xl italic text-ink">Admin-Konto einrichten</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Es existiert noch kein Administrator. Richten Sie hier den ersten (und einzigen über diese Seite
            möglichen) Zugang ein - danach ist diese Seite dauerhaft nicht mehr erreichbar.
          </p>

          <div className="mt-6">
            <AdminSetupForm />
          </div>
        </Card>
      </div>
    </main>
  );
}
