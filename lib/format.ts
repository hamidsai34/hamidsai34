export function money(value: number): string {
  return new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 2 }).format(value) + " DH";
}

export function dateTime(value: string): string {
  return new Date(value).toLocaleString("fr-MA", { dateStyle: "short", timeStyle: "short" });
}

/** Masks an identity number for display in lists, e.g. "AB••••12". */
export function maskId(value: string | null): string {
  if (!value) return "—";
  if (value.length <= 4) return "••••";
  return value.slice(0, 2) + "•".repeat(value.length - 4) + value.slice(-2);
}

export function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / 86_400_000));
}
