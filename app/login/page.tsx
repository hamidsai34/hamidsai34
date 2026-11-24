import { redirect } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import AiKeyFields from "@/components/AiKeyFields";
import { getCurrentUser } from "@/lib/auth";
import { login, register } from "@/app/auth-actions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <div className="auth grid">
      <div className="card">
        <h2>تسجيل الدخول</h2>
        <ActionForm action={login} className="stack">
          <label>البريد الإلكتروني<input name="email" type="email" required autoComplete="email" /></label>
          <label>كلمة السر<input name="password" type="password" required autoComplete="current-password" /></label>
          <AiKeyFields />
          <button type="submit">دخول</button>
        </ActionForm>
      </div>
      <div className="card">
        <h2>حساب جديد</h2>
        <ActionForm action={register} className="stack">
          <label>البريد الإلكتروني<input name="email" type="email" required autoComplete="email" /></label>
          <label>كلمة السر (8 أحرف على الأقل)<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
          <AiKeyFields />
          <button type="submit" className="secondary">إنشاء الحساب</button>
        </ActionForm>
      </div>
    </div>
  );
}
