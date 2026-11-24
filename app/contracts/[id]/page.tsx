import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import { db, type Contract, type Photo, type Vehicle, type Client } from "@/lib/db";
import { addPhoto, closeContract } from "@/app/actions";
import { money, dateTime, daysBetween } from "@/lib/format";

export const dynamic = "force-dynamic";

const DEPOSIT_LABEL = { held: "محجوز", refunded: "مُرجَّع", retained: "محتفظ به" } as const;

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = db();
  const contract = d.prepare("SELECT * FROM contracts WHERE id = ?").get(Number(id)) as unknown as Contract | undefined;
  if (!contract) notFound();
  const vehicle = d.prepare("SELECT * FROM vehicles WHERE id = ?").get(contract.vehicle_id) as unknown as Vehicle;
  const client = d.prepare("SELECT * FROM clients WHERE id = ?").get(contract.client_id) as unknown as Client;
  const photos = d.prepare("SELECT * FROM photos WHERE contract_id = ? ORDER BY id").all(contract.id) as unknown as Photo[];
  const days = daysBetween(contract.start_at, contract.end_at);
  const total = days * contract.daily_rate;
  const isOpen = contract.status === "open";

  return (
    <>
      <div className="actions" style={{ justifyContent: "space-between" }}>
        <h1>{contract.ref} <span className={`badge ${contract.status}`}>{isOpen ? "مفتوح" : "مغلق"}</span></h1>
        <Link className="btn secondary" href={`/contracts/${contract.id}/declaration`}>التصريح القبلي</Link>
      </div>

      <div className="grid two">
        <div className="card">
          <h2>تفاصيل العقد</h2>
          <p><strong>الزبون:</strong> {client.full_name}</p>
          <p><strong>السيارة:</strong> {vehicle.plate} — {vehicle.brand} {vehicle.model}</p>
          <p><strong>من:</strong> {dateTime(contract.start_at)}<br /><strong>إلى:</strong> {dateTime(contract.end_at)}</p>
          <p><strong>المدة:</strong> {days} يوم — <strong>المجموع التقديري:</strong> {money(total)}</p>
          <p><strong>الكوسيون:</strong> {money(contract.deposit_amount)} ({DEPOSIT_LABEL[contract.deposit_status]})</p>
          {contract.mileage_out !== null && <p><strong>العداد عند الخروج:</strong> {contract.mileage_out} كم</p>}
          {contract.mileage_in !== null && <p><strong>العداد عند الإرجاع:</strong> {contract.mileage_in} كم</p>}
          {contract.damage_notes && <p><strong>ملاحظات الأضرار:</strong> {contract.damage_notes}</p>}
        </div>

        {isOpen && (
          <div className="card">
            <h2>إضافة صورة</h2>
            <ActionForm action={addPhoto} className="stack">
              <input type="hidden" name="contract_id" value={contract.id} />
              <div className="row two">
                <label>المرحلة
                  <select name="kind" defaultValue="checkout">
                    <option value="checkout">عند الخروج</option>
                    <option value="return">عند الإرجاع</option>
                  </select>
                </label>
                <label>الجهة
                  <select name="angle" defaultValue="front">
                    <option value="front">الأمام</option>
                    <option value="back">الخلف</option>
                    <option value="left">الجانب الأيسر</option>
                    <option value="right">الجانب الأيمن</option>
                    <option value="dashboard">لوحة القيادة</option>
                    <option value="other">أخرى</option>
                  </select>
                </label>
              </div>
              <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" required />
              <button type="submit">رفع الصورة</button>
            </ActionForm>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>صور التصوير</h2>
        {photos.length === 0 ? <p className="muted">لا توجد صور بعد.</p> : (
          <>
            <h3 style={{ fontSize: 15 }}>عند الخروج</h3>
            <div className="photos">
              {photos.filter((p) => p.kind === "checkout").map((p) => (
                <a key={p.id} href={p.file_path} target="_blank" rel="noreferrer"><img src={p.file_path} alt={p.angle} /></a>
              ))}
            </div>
            <h3 style={{ fontSize: 15 }}>عند الإرجاع</h3>
            <div className="photos">
              {photos.filter((p) => p.kind === "return").map((p) => (
                <a key={p.id} href={p.file_path} target="_blank" rel="noreferrer"><img src={p.file_path} alt={p.angle} /></a>
              ))}
            </div>
          </>
        )}
      </div>

      {isOpen && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>إرجاع السيارة وإغلاق العقد</h2>
          <ActionForm action={closeContract} className="stack">
            <input type="hidden" name="contract_id" value={contract.id} />
            <div className="row three">
              <label>العداد عند الإرجاع (كم)<input name="mileage_in" type="number" min="0" /></label>
              <label>الكوسيون
                <select name="deposit_status" defaultValue="refunded">
                  <option value="refunded">مُرجَّع للزبون</option>
                  <option value="retained">محتفظ به (ضرر)</option>
                  <option value="held">ما زال محجوزاً</option>
                </select>
              </label>
              <label>ملاحظات الأضرار<input name="damage_notes" /></label>
            </div>
            <button type="submit">إغلاق العقد</button>
            <p className="muted">يجب رفع صورة واحدة على الأقل في مرحلة الإرجاع قبل الإغلاق.</p>
          </ActionForm>
        </div>
      )}
    </>
  );
}
