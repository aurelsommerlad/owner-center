import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { getCurrentOwner } from "@/services/ownerService";
import { getPropertiesForOwner } from "@/services/propertyService";

export default async function PropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const owner = await getCurrentOwner();
  const properties = await getPropertiesForOwner(owner.id);
  const property = properties.find((item) => item.id === propertyId);

  if (!property) {
    notFound();
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar propertyId={propertyId} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopBar properties={properties} currentPropertyId={propertyId} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
