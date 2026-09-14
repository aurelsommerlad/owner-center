"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AdminProperty } from "@/types/admin";
import { monthLabel } from "@/lib/dates";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "draft", label: "Entwurf" },
  { value: "ready", label: "Bereit" },
  { value: "detected", label: "Erkannt" },
  { value: "needs_classification", label: "Zu klassifizieren" },
  { value: "published", label: "Veröffentlicht" },
  { value: "updated", label: "Aktualisiert" },
  { value: "archived", label: "Archiviert" },
];

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

      <select
        value={searchParams.get("monat") ?? "all"}
        onChange={(event) => setParam("monat", event.target.value)}
        className={SELECT_CLASS}
      >
        <option value="all">Alle Monate</option>
        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
          <option key={month} value={month}>
            {monthLabel(month)}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("status") ?? "all"}
        onChange={(event) => setParam("status", event.target.value)}
        className={SELECT_CLASS}
      >
        <option value="all">Alle Status</option>
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
