import { redirect } from "next/navigation";
import { getCurrentOwner } from "@/services/ownerService";
import { getPropertiesForOwner } from "@/services/propertyService";

export default async function RootPage() {
  const owner = await getCurrentOwner();
  const properties = await getPropertiesForOwner(owner.id);
  const defaultProperty = properties[0];

  if (!defaultProperty) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-center">
        <p className="text-ink-soft">
          Für Ihr Konto ist aktuell kein Objekt hinterlegt. Bitte wenden Sie sich an UNIQUE
          PLACES.
        </p>
      </main>
    );
  }

  redirect(`/${defaultProperty.id}/uebersicht`);
}
