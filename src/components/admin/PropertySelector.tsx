"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AdminProperty } from "@/types/admin";

// Same <select> chrome as CalendarControls.tsx's unit selector -
// rounded-full/border-line/bg-paper - so filters look identical to Owner
// Center's, not like a new admin-specific input style.
const SELECT_CLASS =
  "rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-medium text-ink-soft outline-none transition-colors hover:border-ink focus:border-ink";

export function PropertySelector({
  properties,
  paramName = "objekt",
}: {
  properties: AdminProperty[];
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = searchParams.get(paramName) ?? "all";

  function onChange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete(paramName);
    else params.set(paramName, next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={SELECT_CLASS}>
      <option value="all">Alle Objekte</option>
      {properties.map((property) => (
        <option key={property.id} value={property.id}>
          {property.name}
        </option>
      ))}
    </select>
  );
}
