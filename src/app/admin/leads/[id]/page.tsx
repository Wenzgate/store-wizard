// src/app/admin/leads/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Params = { id: string };

type LeadWithRelations = Prisma.QuoteRequestGetPayload<{
  include: { items: true; files: true };
}>;

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  return { title: `Lead ${id} • Admin` };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  const lead = await prisma.quoteRequest.findUnique({
    where: { id },
    include: { items: true, files: true },
  });

  if (!lead) notFound();

  // Ici TS sait que notFound() est never ⇒ lead est non-null après
  const l = lead as LeadWithRelations;

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Lead #{l.id.slice(0, 8)}</h1>
        <p className="text-sm text-gray-500">
          Créé le {new Date(l.createdAt).toLocaleString()}
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-2">
          <h2 className="font-medium">Client</h2>
          <div className="text-sm">
            <div>
              <span className="text-gray-500">Nom&nbsp;:</span> {l.firstName} {l.lastName}
            </div>
            <div>
              <span className="text-gray-500">Email&nbsp;:</span> {l.email}
            </div>
            {l.phone && (
              <div>
                <span className="text-gray-500">Téléphone&nbsp;:</span> {l.phone}
              </div>
            )}
            {l.contactPref && (
              <div>
                <span className="text-gray-500">Contact&nbsp;:</span> {l.contactPref}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <h2 className="font-medium">Projet</h2>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-gray-500">Adresse&nbsp;:</span>{" "}
              {[l.street, l.postalCode, l.city, l.country].filter(Boolean).join(", ") || "—"}
            </div>
            {l.budget && (
              <div>
                <span className="text-gray-500">Budget&nbsp;:</span> {l.budget}
              </div>
            )}
            {l.timing && (
              <div>
                <span className="text-gray-500">Timing&nbsp;:</span> {l.timing}
              </div>
            )}
            {l.notes && (
              <div className="whitespace-pre-wrap">
                <span className="text-gray-500">Notes&nbsp;:</span> {l.notes}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="font-medium mb-3">Articles ({l.items.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Qté</th>
                <th className="py-2 pr-3">Dimensions (cm)</th>
                <th className="py-2 pr-3">Pose</th>
                <th className="py-2 pr-3">Commande</th>
                <th className="py-2 pr-3">Couleur/Tissu</th>
                <th className="py-2 pr-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {l.items.map((it) => (
                <tr key={it.id} className="border-b">
                  <td className="py-2 pr-3">{it.type}</td>
                  <td className="py-2 pr-3">{it.quantity}</td>
                  <td className="py-2 pr-3">
                    {it.width} × {it.height}
                    {it.toleranceCm ? ` (±${it.toleranceCm})` : ""}
                  </td>
                  <td className="py-2 pr-3">{it.mount || "—"}</td>
                  <td className="py-2 pr-3">
                    {it.control}
                    {it.controlSide ? ` (${it.controlSide})` : ""}
                  </td>
                  <td className="py-2 pr-3">
                    {it.fabricBrand || it.fabricCollection || it.fabricColorName
                      ? [it.fabricBrand, it.fabricCollection, it.fabricColorName].filter(Boolean).join(" • ")
                      : it.colorCustom || it.colorTone || "—"}
                  </td>
                  <td className="py-2 pr-3">{it.notes || "—"}</td>
                </tr>
              ))}
              {l.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-500">
                    Aucun article.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="font-medium mb-3">Fichiers ({l.files.length})</h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {l.files.map((f) => (
            <li key={f.id}>
              <a
                href={f.url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                {f.name}
              </a>{" "}
              <span className="text-gray-500">({f.mime}, {Math.round(f.size / 1024)} Ko)</span>
            </li>
          ))}
          {l.files.length === 0 && <li className="text-gray-500">Aucun fichier.</li>}
        </ul>
      </section>
    </main>
  );
}
