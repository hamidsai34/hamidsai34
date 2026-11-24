import Link from "next/link";
import { db } from "@/lib/db";
import { money, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type Row = {
  id: number; ref: string; status: string; start_at: string; end_at: string;
  deposit_amount: number; plate: string; full_name: string;
};

export default function ContractsPage() {
  const rows = db().prepare(`
    SELECT c.id, c.ref, c.status, c.start_at, c.end_at, c.deposit_amount, v.plate, cl.full_name
    FROM contracts c JOIN vehicles v ON v.id = c.vehicle_id JOIN clients cl ON cl.id = c.client_id
    ORDER BY c.id DESC`).all() as unknown as Row[];
  return (
    <>
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <h1>العقود</h1>
        <Link className="btn" href="/contracts/new">عقد جديد</Link>
      </div>
      <div className="card">
        {rows.length === 0 ? <p className="muted">لا توجد عقود بعد.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>المرجع</th><th>الزبون</th><th>السيارة</th><th>من</th><th>إلى</th><th>الكوسيون</th><th>الحالة</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/contracts/${r.id}`}>{r.ref}</Link></td>
                <td>{r.full_name}</td><td>{r.plate}</td>
                <td>{dateTime(r.start_at)}</td><td>{dateTime(r.end_at)}</td>
                <td>{money(r.deposit_amount)}</td>
                <td><span className={`badge ${r.status}`}>{r.status === "open" ? "مفتوح" : "مغلق"}</span></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
