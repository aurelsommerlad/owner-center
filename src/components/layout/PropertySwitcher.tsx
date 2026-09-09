"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Property } from "@/types";
import { ChevronDownIcon, MapPinIcon } from "@/components/ui/icons";

interface PropertySwitcherProps {
  properties: Property[];
  currentPropertyId: string;
}

export function PropertySwitcher({ properties, currentPropertyId }: PropertySwitcherProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const current = properties.find((property) => property.id === currentPropertyId) ?? properties[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!current) return null;

  function selectProperty(propertyId: string) {
    setOpen(false);
    if (propertyId === currentPropertyId) return;
    const segment = pathname.split("/").slice(2).join("/") || "uebersicht";
    router.push(`/${propertyId}/${segment}`);
  }

  const isSingleProperty = properties.length <= 1;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !isSingleProperty && setOpen((value) => !value)}
        className={`flex items-center gap-3 rounded-2xl border border-line bg-paper px-3.5 py-2 text-left transition-colors ${
          isSingleProperty ? "cursor-default" : "hover:bg-paper-dim"
        }`}
        aria-haspopup={isSingleProperty ? undefined : "listbox"}
        aria-expanded={open}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-paper">
          <span className="font-display text-sm italic">{current.name.charAt(0)}</span>
        </div>
        <div className="leading-tight">
          <p className="font-display text-[15px] italic text-ink">{current.name}</p>
          <p className="flex items-center gap-1 text-xs text-ink-soft">
            <MapPinIcon className="h-3 w-3" />
            {current.location.city}, {current.location.region}
          </p>
        </div>
        {!isSingleProperty && (
          <ChevronDownIcon
            className={`ml-1 h-4 w-4 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && !isSingleProperty && (
        <div
          role="listbox"
          className="absolute left-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-line bg-paper py-1.5 shadow-soft-lg"
        >
          {properties.map((property) => (
            <button
              key={property.id}
              type="button"
              role="option"
              aria-selected={property.id === currentPropertyId}
              onClick={() => selectProperty(property.id)}
              className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-paper-dim ${
                property.id === currentPropertyId ? "bg-paper-dim" : ""
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper">
                <span className="font-display text-xs italic">{property.name.charAt(0)}</span>
              </div>
              <div className="leading-tight">
                <p className="font-medium text-ink">{property.name}</p>
                <p className="text-xs text-ink-soft">
                  {property.location.city}, {property.location.region}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
