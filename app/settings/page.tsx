import ActionForm from "@/components/ActionForm";
import { pageUser } from "@/lib/auth";
import { getAiSettings } from "@/lib/ai/config";
import { PROVIDERS, type Provider } from "@/lib/ai/providers";
import { saveAiSettings, testAiSettings, removeAiKey } from "@/app/actions";
import { dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await pageUser();
  const current = getAiSettings(user.id);
  const providers = Object.entries(PROVIDERS) as [Provider, (typeof PROVIDERS)[Provider]][];
  const selected = current?.provider ?? "gemini";

  return (
    <>
      <h1>الذكاء الاصطناعي</h1>
      <div className="grid two">
        <div className="card">
          <h2>مفتاح API الخاص بك</h2>
          <p className="muted">
            كل حساب يستعمل مفتاحه الخاص ويدفع تكلفة استعماله مباشرة للمزود. المفتاح يُخزَّن مشفّراً ولا يظهر مرة أخرى بعد الحفظ.
          </p>
          {current && (
            <p>
              <span className="badge closed">مُفعَّل</span>{" "}
              {PROVIDERS[current.provider].label} · {current.model} · مفتاح ينتهي بـ <strong>…{current.key_last4}</strong>
              <br /><span className="hint">آخر تحديث: {dateTime(current.updated_at)}</span>
            </p>
          )}
          <ActionForm action={saveAiSettings} className="stack" keepValues>
            <label>المزود
              <select name="provider" defaultValue={selected}>
                {providers.map(([key, p]) => (
                  <option key={key} value={key}>{p.label}</option>
                ))}
              </select>
            </label>
            <label>اسم النموذج (اتركه فارغاً للنموذج الافتراضي)
              <input name="model" placeholder={PROVIDERS[selected].defaultModel} />
            </label>
            <label>{current ? "مفتاح جديد (اتركه فارغاً للإبقاء على الحالي)" : "المفتاح"}
              <input name="api_key" type="password" autoComplete="off" spellCheck={false} placeholder={PROVIDERS[selected].keyPrefix + "…"} />
            </label>
            <button type="submit">حفظ</button>
          </ActionForm>
          <p className="hint" style={{ marginTop: 12 }}>
            احصل على مفتاحك من:{" "}
            {providers.map(([key, p], i) => (
              <span key={key}>{i > 0 && " · "}<a href={p.keyUrl} target="_blank" rel="noreferrer">{p.label}</a></span>
            ))}
          </p>
        </div>

        <div className="card">
          <h2>التحقق</h2>
          {current ? (
            <>
              <ActionForm action={testAiSettings} className="stack" keepValues>
                <button type="submit" className="secondary">اختبار الاتصال</button>
              </ActionForm>
              <div style={{ marginTop: 16 }}>
                <ActionForm action={removeAiKey} className="stack" keepValues>
                  <button type="submit">حذف المفتاح من حسابي</button>
                </ActionForm>
              </div>
            </>
          ) : (
            <p className="muted">لم تُضف مفتاحاً بعد.</p>
          )}
        </div>
      </div>
    </>
  );
}
