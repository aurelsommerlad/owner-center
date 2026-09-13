import type { ReactNode } from "react";
import { requireAdminRole } from "@/lib/adminAuth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminToastProvider } from "@/components/admin/AdminToast";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Server-side guard for the whole /admin subtree. Every route under here
  // inherits this check by virtue of Next.js layout nesting - it is not
  // possible to reach an /admin page without this running first, which is
  // what makes this a real (if still mocked) access boundary rather than
  // just an absent nav link.
  const session = await requireAdminRole();

  return (
    <AdminToastProvider>
      <div className="flex min-h-screen bg-paper">
        <AdminSidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <AdminHeader session={session} />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</main>
        </div>
      </div>
    </AdminToastProvider>
  );
}
