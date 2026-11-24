import ActionForm from "@/components/ActionForm";
import { db, type Client } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { createClient } from "@/app/actions";
import { maskId } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await pageUser();
  const clients = db().prepare("SELECT * FROM clients WHERE user_id = ? ORDER BY full_name")
    .all(user.id) as unknown as Client[];
  return (
    <>
      <h1>الزبناء</h1>
      <div className="grid two">
        <div className="card">
          <h2>زبون جديد</h2>
          <ActionForm action={createClient} className="stack">
            <label>الاسم الكامل *<input name="full_name" required /></label>
            <div className="row two">
              <label>رقم البطاقة (CIN / CNE)<input name="cin" dir="ltr" /></label>
              <label>رقم رخصة السياقة<input name="license_number" dir="ltr" /></label>
            </div>
            <div className="row two">
              <label>الهاتف<input name="phone" type="tel" dir="ltr" /></label>
              <label>البريد الإلكتروني<input name="email" type="email" dir="ltr" /></label>
            </div>
            <label>العنوان<input name="address" /></label>
            <div className="row two">
              <label>المدينة<input name="city" /></label>
              <label>الرمز البريدي<input name="postal_code" dir="ltr" /></label>
            </div>
            <button type="submit">حفظ</button>
          </ActionForm>
        </div>
        <div className="card">
          <h2>القائمة ({clients.length})</h2>
          {clients.length === 0 ? <p className="muted">لا يوجد زبناء بعد.</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>الاسم</th><th>CIN</th><th>الهاتف</th></tr></thead>
              <tbody>{clients.map((c) => (
                <tr key={c.id}><td>{c.full_name}</td><td dir="ltr">{maskId(c.cin)}</td><td dir="ltr">{c.phone ?? "—"}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>
    </>
  );
}
