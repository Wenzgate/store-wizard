// src/app/admin/leads/[id]/page.tsx
import { notFound } from "next/navigation";
import {
  PrismaClient,
  type QuoteRequest as QuoteRequestModel,
  type StoreItem,
  type FileRef,
} from "@prisma/client";

// Prisma singleton (évite les connexions multiples en dev)
const prisma = (globalThis as any).__prisma ?? new PrismaClient();
if (!(globalThis as any).__prisma) (globalThis as any).__prisma = prisma;

// Force dynamic pour éviter le cache lors de la consult des leads
export const dynamic = "force-dynamic";

type Params = { id: string };

// Typage fort du résultat avec relations
type LeadWithRelations = QuoteRequestModel & {
  items: StoreItem[];
  files: FileRef[];
};

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  return { title: `Lead ${id} • Admin` };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  const lead = (await prisma.quoteRequest.findUnique({
    where: { id },
    include: {
      items: true,
      files: true,
    },
  })) as LeadWithRelations | null;

  if (!lead) notFound();

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Lead #{lead.id.slice(0, 8)}</h1>
        <p className="text-sm text-gray-500">
          Créé le {new Date(lead.createdAt).toLocaleString()}
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-2">
          <h2 className="font-medium">Client</h2>
          <div className="text-sm">
            <div>
              <span className="text-gray-500">Nom&nbsp;:</span> {lead.firstName} {lead.lastName}
            </div>
            <div>
              <span className="text-gray-500">Email&nbsp;:</span> {lead.email}
            </div>
            {lead.phone && (
              <div>
                <span className="text-gray-500">Téléphone&nbsp;:</span> {lead.phone}
              </div>
            )}
            {lead.contactPref && (
              <div>
                <span className="text-gray-500">Contact&nbsp;:</span> {lead.contactPref}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <h2 className="font-medium">Projet</h2>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-gray-500">Adresse&nbsp;:</span>{" "}
              {[lead.street, lead.postalCode, lead.city, lead.country].filter(Boolean).join(", ") || "—"}
            </div>
            {lead.budget && (
              <div>
                <span className="text-gray-500">Budget&nbsp;:</span> {lead.budget}
              </div>
            )}
            {lead.timing && (
              <div>
                <span className="text-gray-500">Timing&nbsp;:</span> {lead.timing}
              </div>
            )}
            {lead.notes && (
              <div className="whitespace-pre-wrap">
                <span className="text-gray-500">Notes&nbsp;:</span> {lead.notes}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="font-medium mb-3">Articles ({lead.items.length})</h2>
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
              {lead.items.map((it: StoreItem) => (
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
              {lead.items.length === 0 && (
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
        <h2 className="font-medium mb-3">Fichiers ({lead.files.length})</h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {lead.files.map((f: FileRef) => (
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
          {lead.files.length === 0 && <li className="text-gray-500">Aucun fichier.</li>}
        </ul>
      </section>
    </main>
  );
}
