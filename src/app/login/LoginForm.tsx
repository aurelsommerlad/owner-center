"use client";

import { useState } from "react";
import { loginAction } from "./actions";

const INPUT_CLASS =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-ink";
const LABEL_CLASS = "text-[11px] uppercase tracking-[0.08em] text-ink-soft";

export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    // On success loginAction() redirects server-side (throws internally) and
    // this call never resolves with a value - only a failed login reaches here.
    const result = await loginAction(formData);
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
          placeholder="name@beispiel.de"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL_CLASS}>Passwort</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className={INPUT_CLASS}
        />
      </label>

      {error && <p className="text-sm text-ink-soft">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Wird geprüft…" : "Anmelden"}
      </button>
    </form>
  );
}
