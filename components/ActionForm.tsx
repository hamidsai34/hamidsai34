"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { ActionResult } from "@/lib/result";

type Props = {
  action: (form: FormData) => Promise<ActionResult | void>;
  className?: string;
  children: ReactNode;
  /** Keep the values after a successful submit (for example, settings forms). */
  keepValues?: boolean;
};

/** Calls a server action and shows its error or success message inline instead of crashing the page. */
export default function ActionForm({ action, className, children, keepValues }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const result = await action(new FormData(form));
      if (result && !result.ok) {
        setError(result.error);
      } else {
        if (result?.data) setInfo(result.data);
        if (!keepValues) form.reset();
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
      {info && <div className="notice" role="status">{info}</div>}
      <fieldset disabled={pending} style={{ border: 0, margin: 0, padding: 0, display: "grid", gap: 10 }}>
        {children}
      </fieldset>
    </form>
  );
}
