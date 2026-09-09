import type { Property } from "@/types";
import { MobileNav } from "./MobileNav";
import { PropertySwitcher } from "./PropertySwitcher";

interface TopBarProps {
  properties: Property[];
  currentPropertyId: string;
}

export function TopBar({ properties, currentPropertyId }: TopBarProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
      <MobileNav propertyId={currentPropertyId} />
      <PropertySwitcher properties={properties} currentPropertyId={currentPropertyId} />
    </header>
  );
}
