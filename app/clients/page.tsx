import ActionForm from "@/components/ActionForm";
import { db, type Client } from "@/lib/db";
import { createClient } from "@/app/actions";
import { maskId } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function ClientsPage() {
  const clients = db().prepare("SELECT * FROM clients ORDER BY full_name").all() as unknown as Client[];
  return (
    <>
      <h1>الزبناء</h1>
      <div className="grid two">
        <div className="card">
          <h2>زبون جديد</h2>
          <ActionForm action={createClient} className="stack">
            <label>الاسم الكامل *<input name="full_name" required /></label>
            <div className="row two">
              <label>رقم البطاقة (CIN / CNE)<input name="cin" /></label>
              <label>رقم رخصة السياقة<input name="license_number" /></label>
            </div>
            <div className="row two">
              <label>الهاتف<input name="phone" type="tel" /></label>
              <label>البريد الإلكتروني<input name="email" type="email" /></label>
            </div>
            <label>العنوان<input name="address" /></label>
            <div className="row two">
              <label>المدينة<input name="city" /></label>
              <label>الرمز البريدي<input name="postal_code" /></label>
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
                <tr key={c.id}><td>{c.full_name}</td><td>{maskId(c.cin)}</td><td>{c.phone ?? "—"}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>
    </>
  );
}
