import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { db, type Vehicle, type Client } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { createContract } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function NewContractPage() {
  const user = await pageUser();
  const vehicles = db().prepare("SELECT * FROM vehicles WHERE user_id = ? ORDER BY brand, model").all(user.id) as unknown as Vehicle[];
  const clients = db().prepare("SELECT * FROM clients WHERE user_id = ? ORDER BY full_name").all(user.id) as unknown as Client[];
  const missing = vehicles.length === 0 || clients.length === 0;

  return (
    <>
      <h1>عقد كراء جديد</h1>
      <div className="card" style={{ maxWidth: 720 }}>
        {missing ? (
          <p>
            قبل إنشاء عقد يجب إضافة {vehicles.length === 0 ? <Link href="/vehicles">سيارة</Link> : null}
            {vehicles.length === 0 && clients.length === 0 ? " و" : null}
            {clients.length === 0 ? <Link href="/clients">زبون</Link> : null}.
          </p>
        ) : (
          <ActionForm action={createContract} className="stack">
            <div className="row two">
              <label>السيارة *
                <select name="vehicle_id" required defaultValue="">
                  <option value="" disabled>اختر السيارة</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>
                  ))}
                </select>
              </label>
              <label>الزبون *
                <select name="client_id" required defaultValue="">
                  <option value="" disabled>اختر الزبون</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="row two">
              <label>تاريخ ووقت الخروج *<input name="start_at" type="datetime-local" required /></label>
              <label>تاريخ ووقت الإرجاع *<input name="end_at" type="datetime-local" required /></label>
            </div>
            <div className="row two">
              <label>ثمن الكراء اليومي (DH) *<input name="daily_rate" type="number" min="0" step="1" required /></label>
              <label>الكوسيون (DH)<input name="deposit_amount" type="number" min="0" step="1" defaultValue="3000" /></label>
            </div>
            <button type="submit">إنشاء العقد</button>
          </ActionForm>
        )}
      </div>
    </>
  );
}
