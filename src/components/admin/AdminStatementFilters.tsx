"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AdminProperty } from "@/types/admin";

// Same <select> chrome as CalendarControls.tsx's unit selector.
const SELECT_CLASS =
  "rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-medium text-ink-soft outline-none transition-colors hover:border-ink focus:border-ink";

export function AdminStatementFilters({ properties, years }: { properties: AdminProperty[]; years: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={searchParams.get("objekt") ?? "all"}
        onChange={(event) => setParam("objekt", event.target.value)}
        className={SELECT_CLASS}
      >
        <option value="all">Alle Objekte</option>
        {properties.map((property) => (
          <option key={property.id} value={property.id}>
            {property.name}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("jahr") ?? "all"}
        onChange={(event) => setParam("jahr", event.target.value)}
        className={SELECT_CLASS}
      >
        <option value="all">Alle Jahre</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </div>
  );
}
