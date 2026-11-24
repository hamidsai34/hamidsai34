"use client";

import { useState } from "react";
import type { ActionResult } from "@/lib/result";

type Props = { action: (contractId: number) => Promise<ActionResult>; contractId: number };

/** Asks the user's AI provider to compare photos. The result is a suggestion to copy after checking it. */
export default function AiDamageHelper({ action, contractId }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run() {
    setPending(true);
    setError(null);
    setText(null);
    const result = await action(contractId);
    setPending(false);
    if (result.ok) setText(result.data ?? "");
    else setError(result.error);
  }

  async function copy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError("Copie impossible. Sélectionnez le texte et copiez-le manuellement.");
    }
  }

  return (
    <div>
      <button type="button" className="secondary" onClick={run} disabled={pending}>
        {pending ? "Analyse en cours…" : "Comparer les photos avec l'IA"}
      </button>
      <p className="muted">Votre clé IA est utilisée. Les photos sont envoyées au fournisseur que vous avez choisi.</p>
      {error && <div className="alert" role="alert">{error}</div>}
      {text !== null && (
        <div className="notice" style={{ whiteSpace: "pre-wrap" }}>
          <strong>Suggestion à vérifier avant de l&apos;enregistrer :</strong>
          <div dir="auto" style={{ marginTop: 6 }}>{text}</div>
          <div className="actions" style={{ marginTop: 8 }}>
            <button type="button" onClick={copy}>{copied ? "Copié" : "Copier"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
