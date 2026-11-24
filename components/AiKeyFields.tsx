import { PROVIDERS } from "@/lib/ai/providers";

/** Optional AI key fields used on the login and registration forms. */
export default function AiKeyFields() {
  return (
    <fieldset style={{ border: "1px dashed var(--line)", borderRadius: 8, padding: 10, display: "grid", gap: 8 }}>
      <legend className="hint" style={{ padding: "0 6px" }}>الذكاء الاصطناعي (اختياري، يمكن إضافته لاحقاً)</legend>
      <label>المزود
        <select name="provider" defaultValue="gemini">
          {Object.entries(PROVIDERS).map(([key, p]) => (
            <option key={key} value={key}>{p.label}</option>
          ))}
        </select>
      </label>
      <label>مفتاح API
        <input name="api_key" type="password" autoComplete="off" spellCheck={false} dir="ltr" placeholder="مفتاحك الخاص" />
      </label>
    </fieldset>
  );
}
