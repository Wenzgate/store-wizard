// src/app/admin/leads/[id]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { id: string };

// Helper générique et typé
function fromMap<T extends Record<string, string>>(
  map: T,
  v?: string,
  fallbackKey?: keyof T
): string {
  if (!v) return fallbackKey ? map[fallbackKey] : "—";
  return v in map ? map[v as keyof T] : v;
}

// Maps
const TYPE_MAP = {
  VENETIAN: "Vénitien",
  ROMAN: "Bateau",
  ROLLER: "Enrouleur",
  PLEATED: "Plissé",
  CASSETTE: "Coffre / Box",
} as const;

const MOUNT_MAP = {
  INSIDE: "Intérieur",
  OUTSIDE: "Extérieur",
  CEILING: "Plafond", // si utilisé côté admin
} as const;

const WINDOW_MAP = {
  WINDOW_SINGLE: "Fenêtre",
  WINDOW_DOOR: "Porte-fenêtre",
  BAY: "Baie",
  CORNER: "Angle",
  SKYLIGHT: "Vélux",
  OTHER: "Autre",
} as const;

const ROOM_MAP = {
  LIVING: "Salon",
  KITCHEN: "Cuisine",
  BEDROOM: "Chambre",
  BATHROOM: "Salle de bain",
  OFFICE: "Bureau",
  OTHER: "Autre",
} as const;

const CONTACT_MAP = {
  EMAIL: "Email",
  PHONE: "Téléphone",
  WHATSAPP: "WhatsApp",
} as const;

const FILE_MIME_MAP = {
  image_jpeg: "image/jpeg",
  image_png: "image/png",
  image_webp: "image/webp",
  application_pdf: "application/pdf",
} as const;

// Labels
const typeLabel = (v?: string) => fromMap(TYPE_MAP, v, "ROLLER");
const mountLabel = (v?: string) => fromMap(MOUNT_MAP, v);
const windowLabel = (v?: string) => fromMap(WINDOW_MAP, v);
const roomLabel = (v?: string) => fromMap(ROOM_MAP, v);
const contactPrefLabel = (v?: string) => fromMap(CONTACT_MAP, v);
const fileMimeLabel = (v?: string) => fromMap(FILE_MIME_MAP, v) || (v ?? "—");

// Helper commande (hoisted)
function controlLabel(it: any) {
  // Champs à plat côté DB: control, controlSide, motorBrand, motorPower, motorNotes
  if (it?.control === "CHAIN") {
    return `Chaînette${it?.controlSide ? ` (${it.controlSide === "LEFT" ? "gauche" : "droite"})` : ""}`;
  }
  if (it?.control === "CRANK") {
    return `Manivelle${it?.controlSide ? ` (${it.controlSide === "LEFT" ? "gauche" : "droite"})` : ""}`;
  }
  if (it?.control === "SPRING") {
    return "Ressort";
  }
  if (it?.control === "MOTOR") {
    const power =
      it?.motorPower === "WIRED" ? "— filaire"
      : it?.motorPower === "BATTERY" ? "— batterie"
      : it?.motorPower === "SOLAR" ? "— solaire"
      : "";
    const brand = it?.motorBrand ? ` (${it.motorBrand})` : "";
    const notes = it?.motorNotes ? ` — ${it.motorNotes}` : "";
    return `Motorisation ${power}${brand}${notes}`.trim();
  }
  return it?.control ?? "—";
}


// --- Data loader (relations existantes confirmées) ---
async function load(id: string) {
  return prisma.quoteRequest.findUnique({
    where: { id },
    include: { items: true, files: true },
  });
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  return { title: `Lead ${id} • Admin` };
}

export default async function LeadDetail({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const data = await load(id);
  if (!data) notFound();

  const items = data.items ?? [];
  const files = data.files ?? [];

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Lead #{data.id.slice(0, 8)}</h1>
        <p className="text-sm text-muted">
          Créé le {new Date(data.createdAt).toLocaleString()}
          {data.locale ? ` • ${data.locale}` : ""}
          {data.source ? ` • Source: ${String(data.source)}` : ""}
          {data.status ? ` • Statut: ${String(data.status)}` : ""}
        </p>
      </header>

      {/* Client */}
      <section className="rounded-2xl border border-border p-4">
        <h2 className="mb-2 text-sm font-semibold">Client</h2>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Nom</dt>
            <dd>{[data.firstName, data.lastName].filter(Boolean).join(" ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Email</dt>
            <dd>{data.email || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Téléphone</dt>
            <dd>{data.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Préférence contact</dt>
            <dd>{contactPrefLabel(data.contactPref as any) || "—"}</dd>
          </div>
        </dl>
      </section>

      {/* Adresse & projet */}
      <section className="rounded-2xl border border-border p-4">
        <h2 className="mb-2 text-sm font-semibold">Adresse</h2>
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Rue</dt>
            <dd>{data.street || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Code postal</dt>
            <dd>{data.postalCode || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Ville</dt>
            <dd>{data.city || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Pays</dt>
            <dd>{data.country || "—"}</dd>
          </div>
          
        </dl>

        {data.notes ? (
          <div className="mt-3">
            <dt className="text-sm font-medium">Notes</dt>
            <dd className="text-sm text-muted">{data.notes}</dd>
          </div>
        ) : null}
      </section>

      {/* Stores */}
      <section className="rounded-2xl border border-border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Stores ({items.length})</h2>
        </div>

        {items.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((it: any, i: number) => (
              <article key={it.id ?? i} className="rounded-xl border border-border p-3 text-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium">Store #{i + 1}</h3>
                </div>
                <dl className="grid grid-cols-[130px,1fr] gap-y-1">
                  <dt className="text-muted">Type</dt>
                  <dd>{typeLabel(it.type)}</dd>

                  <dt className="text-muted">Quantité</dt>
                  <dd>{it.quantity ?? "—"}</dd>

                  <dt className="text-muted">Pose</dt>
                  <dd>{mountLabel(it.mount)}</dd>

                  {it.windowType && (
                    <>
                      <dt className="text-muted">Ouverture</dt>
                      <dd>{windowLabel(it.windowType)}</dd>
                    </>
                  )}

                  {it.room && (
                    <>
                      <dt className="text-muted">Pièce</dt>
                      <dd>
                        {roomLabel(it.room)}
                        {it.roomLabel ? ` (${it.roomLabel})` : ""}
                      </dd>
                    </>
                  )}

                  <dt className="text-muted">Commande</dt>
                  <dd>{controlLabel(it)}</dd>

                  <dt className="text-muted">Dimensions</dt>
                  <dd>
                    {/* width/height en CM dans Prisma */}
                    {typeof it.width === "number" ? it.width : "—"} × {typeof it.height === "number" ? it.height : "—"} mm
                    
                  </dd>

                  {it.fabricOpacity || it.fabricBrand || it.fabricCollection || it.fabricColorName || it.fabricColorCode ? (
                    <>
                      <dt className="text-muted">Tissu</dt>
                      <dd>
                        {[it.fabricBrand, it.fabricCollection, it.fabricColorName, it.fabricColorCode]
                          .filter(Boolean)
                          .join(" • ") || "—"}
                        {typeof it.fabricOpennessPct === "number" ? ` • screen ${it.fabricOpennessPct}%` : ""}
                        {it.fabricOpacity ? ` • ${String(it.fabricOpacity).toLowerCase()}` : ""}
                      </dd>
                    </>
                  ) : null}

                  {(it.colorTone || it.colorCustom) && (
                    <>
                      <dt className="text-muted">Couleur</dt>
                      <dd>
                        {it.colorTone ?? "—"}
                        {it.colorCustom ? ` (${it.colorCustom})` : ""}
                      </dd>
                    </>
                  )}

                  {it.notes && (
                    <>
                      <dt className="text-muted">Notes</dt>
                      <dd>
                        <em>{it.notes}</em>
                      </dd>
                    </>
                  )}
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Aucun store renseigné.</p>
        )}
      </section>

      {/* Fichiers */}
      {files.length ? (
        <section className="rounded-2xl border border-border p-4">
          <h2 className="mb-2 text-sm font-semibold">Fichiers</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {files.map((f: any, i: number) => (
              <li key={f.id ?? i}>
                {f.name ?? "fichier"} — {fileMimeLabel(f.mime)}{" "}
                {typeof f.size === "number" ? `• ${Math.round(f.size / 1024)} Ko` : ""}
                {f.url ? ` • ${f.url}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
