import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { prisma } from "@/server/db";
import { adminAccountExists } from "@/server/adminBootstrapCore";
import { Card } from "@/components/ui/Card";
import { AdminLoginForm } from "./AdminLoginForm";

/**
 * Separate from src/app/login/page.tsx by design (see adminLoginAction's
 * comment) - lives outside the app/admin/(protected) route group so it is
 * reachable without a session (the group's layout is what gates every
 * other /admin/* route via requireAdminRole).
 *
 * `force-dynamic` is required: the admin-exists check below runs (and can
 * redirect) before any `cookies()` call, so Next.js's static analysis
 * cannot infer on its own that this page depends on live, per-request
 * database state - see the same note on /admin/setup/page.tsx.
 */
export const dynamic = "force-dynamic";
export default async function AdminLoginPage() {
  // No admin exists yet - a login form here could never succeed, send the
  // visitor to the one-time setup instead (same redirect requireAdminRole()
  // applies to every other /admin/* route).
  if (!(await adminAccountExists(prisma))) {
    redirect("/admin/setup");
  }

  const session = await getSession();
  if (session) {
    redirect(session.role === "admin" ? "/admin" : "/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-sans text-sm font-semibold tracking-[0.05em] text-ink">UNIQUE PLACES</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft">Admin</p>
        </div>

        <Card className="p-6 shadow-soft-lg sm:p-8">
          <h1 className="font-display text-xl italic text-ink">Anmelden</h1>
          <p className="mt-1 text-sm text-ink-soft">Interner Bereich - nur für UNIQUE PLACES Administratoren.</p>

          <div className="mt-6">
            <AdminLoginForm />
          </div>
        </Card>
      </div>
    </main>
  );
}
