import ActionForm from "@/components/ActionForm";
import { db, type Vehicle } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { createVehicle } from "@/app/actions";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  const user = await pageUser();
  const vehicles = db().prepare("SELECT * FROM vehicles WHERE user_id = ? ORDER BY brand, model")
    .all(user.id) as unknown as Vehicle[];
  return (
    <>
      <h1>السيارات</h1>
      <div className="grid two">
        <div className="card">
          <h2>سيارة جديدة</h2>
          <ActionForm action={createVehicle} className="stack">
            <div className="row two">
              <label>رقم التسجيل *<input name="plate" required placeholder="12345-A-6" /></label>
              <label>ثمن الكراء اليومي (DH)<input name="daily_rate" type="number" min="0" step="1" /></label>
            </div>
            <div className="row two">
              <label>الماركة *<input name="brand" required /></label>
              <label>الموديل *<input name="model" required /></label>
            </div>
            <div className="row two">
              <label>السنة<input name="year" type="number" min="1990" max="2100" /></label>
              <label>اللون<input name="color" /></label>
            </div>
            <button type="submit">حفظ</button>
          </ActionForm>
        </div>
        <div className="card">
          <h2>الأسطول ({vehicles.length})</h2>
          {vehicles.length === 0 ? <p className="muted">لا توجد سيارات بعد.</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>التسجيل</th><th>السيارة</th><th>الكراء/يوم</th></tr></thead>
              <tbody>{vehicles.map((v) => (
                <tr key={v.id}><td dir="ltr">{v.plate}</td><td>{v.brand} {v.model} {v.year ?? ""}</td><td>{money(v.daily_rate)}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      </div>
    </>
  );
}
