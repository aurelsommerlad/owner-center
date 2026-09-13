"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AdminOwner } from "@/types/admin";

const SELECT_CLASS =
  "rounded-full border border-line bg-paper px-3.5 py-2 text-xs font-medium text-ink-soft outline-none transition-colors hover:border-ink focus:border-ink";

export function OwnerSelector({
  owners,
  paramName = "eigentuemer",
}: {
  owners: AdminOwner[];
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
      <option value="all">Alle Eigentümer</option>
      {owners.map((owner) => (
        <option key={owner.id} value={owner.id}>
          {owner.name}
        </option>
      ))}
    </select>
  );
}
