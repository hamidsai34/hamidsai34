import { notFound } from "next/navigation";
import { db, type Contract, type Vehicle, type Client } from "@/lib/db";
import { dateTime } from "@/lib/format";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <tr><td className="k">{k}</td><td>{v || "—"}</td></tr>
  );
}

export default async function DeclarationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = db();
  const contract = d.prepare("SELECT * FROM contracts WHERE id = ?").get(Number(id)) as unknown as Contract | undefined;
  if (!contract) notFound();
  const vehicle = d.prepare("SELECT * FROM vehicles WHERE id = ?").get(contract.vehicle_id) as unknown as Vehicle;
  const client = d.prepare("SELECT * FROM clients WHERE id = ?").get(contract.client_id) as unknown as Client;

  return (
    <>
      <div className="no-print actions" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <h1>التصريح القبلي — {contract.ref}</h1>
        <PrintButton />
      </div>
      <div className="declaration" dir="ltr">
        <p style={{ textAlign: "center", margin: 0, fontWeight: 700 }}>
          Déclaration préalable de location de voiture sans chauffeur
        </p>
        <p className="muted" style={{ textAlign: "center", marginTop: 4 }}>
          (à renseigner par le locataire résident au Maroc)
        </p>
        <p style={{ fontWeight: 600, marginTop: 16 }}>Identité du locataire</p>
        <table>
          <tbody>
            <Row k="Nom et prénom" v={client.full_name} />
            <Row k="N° CIN / CNE ou carte de séjour" v={client.cin} />
            <Row k="N° de permis de conduire" v={client.license_number} />
            <Row k="Adresse" v={client.address} />
            <Row k="Ville" v={client.city} />
            <Row k="Code postal" v={client.postal_code} />
            <Row k="N° de GSM" v={client.phone} />
            <Row k="Adresse email" v={client.email} />
          </tbody>
        </table>

        <p style={{ fontWeight: 600, marginTop: 16 }}>Véhicule et période de location</p>
        <table>
          <tbody>
            <Row k="Immatriculation sous numéro" v={vehicle.plate} />
            <Row k="Marque et modèle" v={`${vehicle.brand} ${vehicle.model}`} />
            <Row k="Date et heure de départ" v={dateTime(contract.start_at)} />
            <Row k="Date et heure de restitution" v={dateTime(contract.end_at)} />
          </tbody>
        </table>

        <p className="muted" style={{ marginTop: 20 }}>
          Fait à : ______________________ &nbsp;&nbsp; Le : ____ / ____ / ________
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div style={{ border: "1px solid #999", minHeight: 90, padding: 8 }}>Signature et cachet de l&apos;agence de location</div>
          <div style={{ border: "1px solid #999", minHeight: 90, padding: 8 }}>Signature du locataire</div>
        </div>
      </div>
    </>
  );
}
