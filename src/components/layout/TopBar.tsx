import type { Property } from "@/types";
import { MobileNav } from "./MobileNav";
import { PropertySwitcher } from "./PropertySwitcher";

interface TopBarProps {
  properties: Property[];
  currentPropertyId: string;
}

export function TopBar({ properties, currentPropertyId }: TopBarProps) {
  // MobileNav's hamburger is only visible below the `lg` breakpoint (it has
  // its own `lg:hidden`), and PropertySwitcher renders nothing for a
  // single-property owner - so at `lg` and above, a single-property owner's
  // bar has no content at all. Collapse the bar itself there too, rather
  // than leaving an empty bordered strip; below `lg` the hamburger still
  // needs the bar, regardless of property count.
  const hasSwitcher = properties.length > 1;

  return (
    <header
      className={`sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8 ${
        hasSwitcher ? "" : "lg:hidden"
      }`}
    >
      <MobileNav propertyId={currentPropertyId} />
      <PropertySwitcher properties={properties} currentPropertyId={currentPropertyId} />
    </header>
  );
}
