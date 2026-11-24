import Link from "next/link";
import { db } from "@/lib/db";
import { pageUser } from "@/lib/auth";
import { money, dateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await pageUser();
  const d = db();
  const count = (sql: string) => (d.prepare(sql).get(user.id) as { n: number }).n;
  const vehicles = count("SELECT COUNT(*) AS n FROM vehicles WHERE user_id = ?");
  const openContracts = count("SELECT COUNT(*) AS n FROM contracts WHERE user_id = ? AND status = 'open'");
  const deposits = (d.prepare(
    "SELECT COALESCE(SUM(deposit_amount), 0) AS s FROM contracts WHERE user_id = ? AND status = 'open' AND deposit_status = 'held'"
  ).get(user.id) as { s: number }).s;
  const upcoming = d.prepare(`
    SELECT c.id, c.ref, c.end_at, v.plate, cl.full_name
    FROM contracts c JOIN vehicles v ON v.id = c.vehicle_id JOIN clients cl ON cl.id = c.client_id
    WHERE c.user_id = ? AND c.status = 'open' ORDER BY c.end_at ASC LIMIT 5`).all(user.id) as
    { id: number; ref: string; end_at: string; plate: string; full_name: string }[];

  return (
    <>
      <h1>لوحة التحكم</h1>
      <div className="grid three">
        <div className="card"><div className="muted">السيارات</div><div className="stat">{vehicles}</div></div>
        <div className="card"><div className="muted">عقود مفتوحة</div><div className="stat">{openContracts}</div></div>
        <div className="card"><div className="muted">كوسيون محجوز</div><div className="stat">{money(deposits)}</div></div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="actions" style={{ justifyContent: "space-between", marginBottom: 12 }}>
          <h2>العقود القريبة من الإرجاع</h2>
          <Link className="btn" href="/contracts/new">عقد جديد</Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="muted">لا توجد عقود مفتوحة بعد.</p>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>المرجع</th><th>الزبون</th><th>السيارة</th><th>الإرجاع</th></tr></thead>
            <tbody>{upcoming.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/contracts/${c.id}`}>{c.ref}</Link></td>
                <td>{c.full_name}</td><td>{c.plate}</td><td>{dateTime(c.end_at)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
