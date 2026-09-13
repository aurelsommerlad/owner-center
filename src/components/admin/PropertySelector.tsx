"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AdminProperty } from "@/types/admin";

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
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-full border border-[#E4E0D8] bg-[#F8F6F1] px-3.5 py-2 text-xs font-medium text-[#74736E] outline-none transition-colors hover:border-[#171817] focus:border-[#171817]"
    >
      <option value="all">Alle Objekte</option>
      {properties.map((property) => (
        <option key={property.id} value={property.id}>
          {property.name}
        </option>
      ))}
    </select>
  );
}
