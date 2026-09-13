"use client";

import { useState } from "react";
import { setupAdminAction } from "./actions";

const INPUT_CLASS =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-ink";
const LABEL_CLASS = "text-[11px] uppercase tracking-[0.08em] text-ink-soft";

export function AdminSetupForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    // On success setupAdminAction() logs the new admin in and redirects
    // server-side (throws internally) - only a failed attempt reaches here.
    const result = await setupAdminAction(formData);
    setPending(false);
    if (!result.ok) setError(result.message);
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>E-Mail</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          autoFocus
          className={INPUT_CLASS}
          placeholder="name@unique-places.example"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Passwort</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={INPUT_CLASS}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Passwort bestätigen</span>
        <input
          type="password"
          name="confirmPassword"
          required
          minLength={8}
          autoComplete="new-password"
          className={INPUT_CLASS}
        />
      </label>

      {error && <p className="text-sm text-ink-soft">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Wird angelegt…" : "Admin-Zugang erstellen"}
      </button>
    </form>
  );
}
