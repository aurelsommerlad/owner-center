"use client";

import { useRouter } from "next/navigation";
import type { Unit } from "@/types";
import { monthLabel, parseIsoDate } from "@/lib/dates";
import { MOCK_TODAY } from "@/lib/config";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

interface CalendarControlsProps {
  propertyId: string;
  year: number;
  month: number;
  units: Unit[];
  selectedUnitId?: string;
}

function buildQuery(year: number, month: number, unitId?: string): string {
  const params = new URLSearchParams({ year: String(year), month: String(month) });
  if (unitId) params.set("unit", unitId);
  return params.toString();
}

export function CalendarControls({
  propertyId,
  year,
  month,
  units,
  selectedUnitId,
}: CalendarControlsProps) {
  const router = useRouter();

  function go(nextYear: number, nextMonth: number) {
    router.push(`/${propertyId}/kalender?${buildQuery(nextYear, nextMonth, selectedUnitId)}`);
  }

  function goToPreviousMonth() {
    go(month === 1 ? year - 1 : year, month === 1 ? 12 : month - 1);
  }

  function goToNextMonth() {
    go(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1);
  }

  function goToToday() {
    const todayDate = parseIsoDate(MOCK_TODAY);
    go(todayDate.getUTCFullYear(), todayDate.getUTCMonth() + 1);
  }

  function onUnitChange(nextUnitId: string) {
    router.push(
      `/${propertyId}/kalender?${buildQuery(year, month, nextUnitId === "all" ? undefined : nextUnitId)}`
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={goToPreviousMonth}
          aria-label="Vorheriger Monat"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        <p className="min-w-[150px] text-center font-display text-xl italic text-ink">
          {monthLabel(month)} {year}
        </p>
        <button
          type="button"
          onClick={goToNextMonth}
          aria-label="Nächster Monat"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={goToToday}
          className="ml-1 rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          Heute
        </button>
      </div>

      <select
        value={selectedUnitId ?? "all"}
        onChange={(event) => onUnitChange(event.target.value)}
        className="rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-medium text-ink-soft outline-none transition-colors hover:border-ink focus:border-ink"
      >
        <option value="all">Alle Einheiten</option>
        {units.map((unit) => (
          <option key={unit.id} value={unit.id}>
            {unit.name}
          </option>
        ))}
      </select>
    </div>
  );
}
