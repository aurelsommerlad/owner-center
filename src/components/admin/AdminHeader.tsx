import { AdminMobileNav } from "./AdminMobileNav";
import type { AdminSession } from "@/lib/adminAuth";

// Mirrors components/layout/TopBar.tsx exactly (sticky bar, blur, border,
// spacing) - swaps the PropertySwitcher for a simple session identity chip,
// since Admin isn't scoped to one property.

export function AdminHeader({ session }: { session: AdminSession }) {
  const initial = session.name.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
      <AdminMobileNav />
      <span className="hidden text-xs font-medium uppercase tracking-[0.14em] text-ink-soft lg:inline">
        Interner Bereich
      </span>
      <div className="ml-auto flex items-center gap-2.5 rounded-2xl border border-line bg-paper px-3.5 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper">
          <span className="text-xs font-medium">{initial}</span>
        </div>
        <span className="hidden text-sm text-ink sm:inline">{session.name}</span>
      </div>
    </header>
  );
}
