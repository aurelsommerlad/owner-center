"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminModal } from "./AdminModal";
import { useAdminToast } from "./AdminToast";
import { ADMIN_INPUT_CLASS, ADMIN_LABEL_CLASS, ADMIN_SELECT_CLASS } from "./adminFormStyles";
import { createPropertyFromApaleoAction, setApaleoPropertyMappingAction } from "@/app/admin/actions";

interface UnmappedProperty {
  id: string;
  name: string;
  location: string;
}

/**
 * "Aktion" column on the /admin/properties apaleo table: for a not-yet-
 * mapped apaleo property, lets the admin either create a brand-new internal
 * Property pre-linked to it, or attach it to an existing unmapped internal
 * Property - both end at setApaleoPropertyMappingAction's/
 * createPropertyFromApaleoAction's server-side uniqueness check, never a
 * silent overwrite. Once mapped, this cell just links to the property.
 */
export function ApaleoPropertyActionCell({
  apaleoId,
  apaleoName,
  linkedPropertyId,
  unmappedProperties,
}: {
  apaleoId: string;
  apaleoName: string;
  linkedPropertyId: string | null;
  unmappedProperties: UnmappedProperty[];
}) {
  const [modal, setModal] = useState<"create" | "link" | null>(null);

  if (linkedPropertyId) {
    return (
      <Link
        href={`/admin/properties/${linkedPropertyId}`}
        className="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
      >
        Objekt öffnen
      </Link>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setModal("create")}
          className="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Internes Objekt anlegen
        </button>
        {unmappedProperties.length > 0 && (
          <button
            type="button"
            onClick={() => setModal("link")}
            className="text-xs font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Mit vorhandenem Objekt verknüpfen
          </button>
        )}
      </div>

      <CreatePropertyFromApaleoModal
        open={modal === "create"}
        onClose={() => setModal(null)}
        apaleoId={apaleoId}
        apaleoName={apaleoName}
      />
      <LinkExistingPropertyModal
        open={modal === "link"}
        onClose={() => setModal(null)}
        apaleoId={apaleoId}
        unmappedProperties={unmappedProperties}
      />
    </>
  );
}

function CreatePropertyFromApaleoModal({
  open,
  onClose,
  apaleoId,
  apaleoName,
}: {
  open: boolean;
  onClose: () => void;
  apaleoId: string;
  apaleoName: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showToast = useAdminToast();

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createPropertyFromApaleoAction(apaleoId, formData);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onClose();
    showToast(result.message);
  }

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Internes Objekt anlegen"
      description={`Aus apaleo: ${apaleoName} (${apaleoId})`}
    >
      <form action={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={ADMIN_LABEL_CLASS}>Objektname</span>
          <input name="name" required defaultValue={apaleoName} className={ADMIN_INPUT_CLASS} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={ADMIN_LABEL_CLASS}>Standort</span>
          <input name="location" required className={ADMIN_INPUT_CLASS} placeholder="z. B. Lindau" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={ADMIN_LABEL_CLASS}>Status</span>
          <select name="status" defaultValue="active" className={ADMIN_SELECT_CLASS}>
            <option value="active">Aktiv</option>
            <option value="inactive">Inaktiv</option>
          </select>
        </label>
        <div>
          <span className={ADMIN_LABEL_CLASS}>apaleo Property-ID</span>
          <p className="mt-1.5 text-sm text-ink">{apaleoId}</p>
        </div>

        {error && <p className="text-sm text-ink-soft">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Speichert…" : "Objekt anlegen"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

function LinkExistingPropertyModal({
  open,
  onClose,
  apaleoId,
  unmappedProperties,
}: {
  open: boolean;
  onClose: () => void;
  apaleoId: string;
  unmappedProperties: UnmappedProperty[];
}) {
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showToast = useAdminToast();

  async function handleLink() {
    if (!selected) return;
    setPending(true);
    setError(null);
    const result = await setApaleoPropertyMappingAction(selected, apaleoId);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onClose();
    showToast(result.message);
  }

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Mit vorhandenem Objekt verknüpfen"
      description={`apaleo Property-ID: ${apaleoId}`}
    >
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={ADMIN_LABEL_CLASS}>Internes Objekt</span>
          <select value={selected} onChange={(event) => setSelected(event.target.value)} className={ADMIN_SELECT_CLASS}>
            <option value="">Objekt wählen…</option>
            {unmappedProperties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name} · {property.location}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-ink-soft">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleLink}
            disabled={!selected || pending}
            className="rounded-full bg-ink px-4 py-2 text-xs font-medium text-paper transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Verknüpft…" : "Verknüpfen"}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}
