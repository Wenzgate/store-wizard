import { PrismaClient } from "@prisma/client";
import Link from "next/link";

const prisma = new PrismaClient();

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;

  const lead = await prisma.quoteRequest.findUnique({
    where: { id },
    include: {
      items: {
        include: { files: true },
        orderBy: { createdAt: "asc" },
      },
      files: true,
    },
  });

  if (!lead) {
    return (
      <main className="mx-auto max-w-4xl p-4">
        <p className="text-sm">Lead introuvable.</p>
        <Link href="/admin/leads" className="mt-3 inline-block rounded-md border border-border px-3 py-1.5 text-sm">
          ← Retour
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-4 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Lead #{lead.id.slice(0, 8)}</h1>
        <Link href="/admin/leads" className="rounded-md border border-border px-3 py-1.5 text-sm">
          ← Retour à la liste
        </Link>
      </header>

      {/* Infos client */}
      <section className="rounded-2xl border border-border p-4">
        <h2 className="mb-2 text-sm font-semibold">Client</h2>
        <dl className="grid grid-cols-[140px,1fr] gap-2 text-sm">
          <Row k="Nom" v={`${lead.firstName} ${lead.lastName}`} />
          <Row k="Email" v={lead.email} />
          <Row k="Téléphone" v={lead.phone ?? "—"} />
          <Row
            k="Adresse"
            v={[lead.street, lead.postalCode, lead.city, lead.country].filter(Boolean).join(", ") || "—"}
          />
          <Row k="Statut" v={lead.status} />
          <Row k="Créé" v={new Date(lead.createdAt).toLocaleString("fr-BE")} />
          <Row k="Langue" v={lead.locale ?? "—"} />
          <Row k="Source" v={lead.source ?? "—"} />
        </dl>
        {lead.notes ? <p className="mt-2 text-sm"><strong>Notes:</strong> {lead.notes}</p> : null}
      </section>

      {/* Items */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Stores ({lead.items.length})</h2>
        {lead.items.map((it, idx) => (
          <article key={it.id} className="rounded-2xl border border-border p-4">
            <h3 className="mb-2 text-sm font-semibold">Store #{idx + 1}</h3>
            <dl className="grid grid-cols-[160px,1fr] gap-2 text-sm">
              <Row k="Type" v={it.type} />
              <Row k="Quantité" v={String(it.quantity)} />
              <Row k="Pose" v={it.mount} />
              {it.windowType ? <Row k="Ouverture" v={it.windowType} /> : null}
              {it.room || it.roomLabel ? <Row k="Pièce" v={[it.room, it.roomLabel].filter(Boolean).join(" / ")} /> : null}
              <Row
                k="Dimensions"
                v={`${it.width} × ${it.height} cm${it.toleranceCm != null ? ` (± ${it.toleranceCm} cm)` : ""}`}
              />
              <Row k="Commande" v={it.control + (it.controlSide ? ` (${it.controlSide})` : "")} />
              {(it.motorBrand || it.motorPower || it.motorNotes) ? (
                <Row
                  k="Motorisation"
                  v={[it.motorBrand, it.motorPower, it.motorNotes].filter(Boolean).join(" · ")}
                />
              ) : null}
              {(it.fabricBrand || it.fabricCollection || it.fabricColorName || it.fabricColorCode || it.fabricOpacity) ? (
                <Row
                  k="Tissu"
                  v={[
                    it.fabricBrand,
                    it.fabricCollection,
                    it.fabricColorName,
                    it.fabricColorCode,
                    it.fabricOpacity ? `(${it.fabricOpacity})` : "",
                    it.fabricOpennessPct != null ? `${it.fabricOpennessPct}%` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              ) : null}
              {it.colorTone || it.colorCustom ? <Row k="Couleur" v={[it.colorTone, it.colorCustom].filter(Boolean).join(" / ")} /> : null}
              {it.notes ? <Row k="Notes" v={it.notes} /> : null}
            </dl>

            {it.files.length ? (
              <div className="mt-2">
                <p className="text-sm font-medium">Fichiers ({it.files.length})</p>
                <ul className="list-inside list-disc text-sm">
                  {it.files.map((f) => (
                    <li key={f.id}>
                      <a href={f.url ?? "#"} target="_blank" rel="noreferrer" className="underline">
                        {f.name}
                      </a>{" "}
                      — {f.mime} — {(f.size / 1024).toFixed(0)} Ko
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        ))}
      </section>

      {/* Fichiers globaux */}
      {lead.files.length ? (
        <section className="rounded-2xl border border-border p-4">
          <h2 className="mb-2 text-sm font-semibold">Fichiers globaux ({lead.files.length})</h2>
          <ul className="list-inside list-disc text-sm">
            {lead.files.map((f) => (
              <li key={f.id}>
                <a href={f.url ?? "#"} target="_blank" rel="noreferrer" className="underline">
                  {f.name}
                </a>{" "}
                — {f.mime} — {(f.size / 1024).toFixed(0)} Ko
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Payload brut */}
      <section className="rounded-2xl border border-border p-4">
        <details>
          <summary className="cursor-pointer text-sm font-semibold">Voir payload brut</summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-black/5 p-3 text-xs dark:bg-white/10">
            {JSON.stringify(lead, null, 2)}
          </pre>
        </details>
      </section>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-muted">{k}</dt>
      <dd>{v}</dd>
    </>
  );
}
