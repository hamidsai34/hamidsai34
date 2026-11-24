"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { ActionResult } from "@/lib/types";

type Props = {
  action: (form: FormData) => Promise<ActionResult | void>;
  className?: string;
  children: ReactNode;
};

/** Calls a server action and shows its error message inline instead of crashing the page. */
export default function ActionForm({ action, className, children }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    setPending(true);
    try {
      const result = await action(new FormData(form));
      if (result && !result.ok) {
        setError(result.error);
      } else {
        form.reset();
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={className} encType="multipart/form-data">
      {error && <div className="alert" role="alert">{error}</div>}
      <fieldset disabled={pending} style={{ border: 0, margin: 0, padding: 0, display: "grid", gap: 10 }}>
        {children}
      </fieldset>
    </form>
  );
}
