import { AdminMobileNav } from "./AdminMobileNav";
import type { AdminSession } from "@/lib/adminAuth";

export function AdminHeader({ session }: { session: AdminSession }) {
  const initial = session.name.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#E4E0D8] bg-[#F8F6F1]/90 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
      <AdminMobileNav />
      <span className="hidden text-xs font-medium uppercase tracking-[0.14em] text-[#74736E] lg:inline">
        Interner Bereich
      </span>
      <div className="ml-auto flex items-center gap-2.5 rounded-full border border-[#E4E0D8] bg-[#F1EDE4] py-1 pl-1 pr-3.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#171817] text-xs font-medium text-[#FAFAF7]">
          {initial}
        </span>
        <span className="hidden text-xs font-medium text-[#171817] sm:inline">{session.name}</span>
      </div>
    </header>
  );
}
