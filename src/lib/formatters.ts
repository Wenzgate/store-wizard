/**
 * Utils de formatage — LOT 2
 * Formatage texte / HTML pour prévisualiser un payload de devis.
 */
import type { QuoteRequest, StoreItem } from "@/types/quote";

/* ---------- Helpers ---------- */

const fmt = new Intl.NumberFormat("fr-BE");
const nbsp = "\u00A0";

const label = {
  storeType: {
    VENETIAN: "Store vénitien",
    ROMAN: "Store bateau",
    ROLLER: "Store enrouleur",
    PLEATED: "Store plissé",
    CASSETTE: "Store coffre/box",
  } as const,
  mount: {
    INSIDE: "Pose dans l'embrasure",
    OUTSIDE: "Pose murale (recouvrement)",
    CEILING: "Pose plafond",
  } as const,
  control: {
    CHAIN: "Chaînette",
    MOTOR: "Motorisation",
    CRANK: "Manivelle",
    SPRING: "Ressort",
  } as const,
  side: {
    LEFT: "Gauche",
    RIGHT: "Droite",
  } as const,
  room: {
    LIVING: "Salon",
    KITCHEN: "Cuisine",
    BEDROOM: "Chambre",
    BATHROOM: "Salle de bain",
    OFFICE: "Bureau",
    OTHER: "Autre",
  } as const,
  window: {
    WINDOW_SINGLE: "Fenêtre",
    WINDOW_DOOR: "Porte-fenêtre",
    BAY: "Baie",
    CORNER: "Angle",
    SKYLIGHT: "Vélux",
    OTHER: "Autre",
  } as const,
  budget: {
    LOW: "Budget serré",
    MID: "Standard",
    HIGH: "Premium",
    LUX: "Haut de gamme",
  } as const,
  timing: {
    ASAP: "Dès que possible",
    W2_4: "Sous 2–4 semaines",
    FLEX: "Flexible",
    JUST_INFO: "Information uniquement",
  } as const,
};

function lines(parts: (string | undefined | null | false)[], bullet = "- "): string {
  return parts.filter(Boolean).map((s) => `${bullet}${s}`).join("\n");
}

function fmtDims(it: StoreItem): string {
  const t = it.dims.toleranceCm != null ? ` (tolérance ${it.dims.toleranceCm}${nbsp}cm)` : "";
  return `${it.dims.width}${nbsp}×${nbsp}${it.dims.height}${nbsp}cm${t}`;
}

function fmtColor(it: StoreItem): string | undefined {
  if (!it.color?.tone && !it.color?.custom) return;
  if (it.color?.tone === "CUSTOM" && it.color?.custom) return `Couleur: ${it.color.custom}`;
  if (it.color?.tone) return `Couleur: ${it.color.tone.toLowerCase()}`;
}

function fmtFabric(it: StoreItem): string | undefined {
  if (!it.fabric) return;
  const parts: string[] = [];
  const b = it.fabric.brand ?? "BANDALUX";
  if (b) parts.push(b);
  if (it.fabric.collection) parts.push(it.fabric.collection);
  if (it.fabric.colorName) parts.push(it.fabric.colorName);
  if (it.fabric.colorCode) parts.push(`#${it.fabric.colorCode}`);
  if (it.fabric.opacity) parts.push(`(${it.fabric.opacity.toLowerCase()})`);
  if (it.fabric.opennessFactorPct != null) parts.push(`${it.fabric.opennessFactorPct}${nbsp}%`);
  return `Tissu: ${parts.join(" · ")}`;
}

function fmtControl(it: StoreItem): string {
  const base = label.control[it.control];
  if (it.control === "CHAIN" || it.control === "CRANK") {
    const side = it.controlSide ? ` — côté ${label.side[it.controlSide]}` : "";
    return `${base}${side}`;
  }
  if (it.control === "MOTOR") {
    const power = it.motor?.power ? ` — ${it.motor.power.toLowerCase()}` : "";
    const brand = it.motor?.brand ? ` (${it.motor.brand})` : "";
    return `${base}${power}${brand}`;
  }
  return base;
}

/* ---------- Public API ---------- */

/** Format texte brut (pour notes internes / Slack / console) */
export function formatQuoteText(q: QuoteRequest): string {
  const header = [
    `Devis — ${q.customer.firstName} ${q.customer.lastName}`,
    `Email: ${q.customer.email}`,
    q.customer.phone ? `Téléphone: ${q.customer.phone}` : undefined,
    q.customer.contactPref ? `Contact: ${q.customer.contactPref.toLowerCase()}` : undefined,
    q.project?.budget ? `Budget: ${label.budget[q.project.budget]}` : undefined,
    q.project?.timing ? `Délai: ${label.timing[q.project.timing]}` : undefined,
    q.project?.address
      ? `Adresse: ${[
          q.project.address.street,
          q.project.address.postalCode,
          q.project.address.city,
          q.project.address.country,
        ]
          .filter(Boolean)
          .join(", ")}`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  const items = q.items
    .map((it, i) => {
      const head = `#${i + 1} — ${label.storeType[it.type]} ×${it.quantity}`;
      const details = lines(
        [
          it.room ? `Pièce: ${label.room[it.room]}${it.roomLabel ? ` (${it.roomLabel})` : ""}` : it.roomLabel,
          it.windowType ? `Ouverture: ${label.window[it.windowType]}` : undefined,
          `Pose: ${label.mount[it.mount]}`,
          `Commande: ${fmtControl(it)}`,
          `Dimensions: ${fmtDims(it)}`,
          fmtFabric(it),
          fmtColor(it),
          it.notes ? `Notes: ${it.notes}` : undefined,
          it.files?.length ? `Fichiers: ${it.files.length}` : undefined,
        ],
        "• "
      );
      return `${head}\n${details}`;
    })
    .join("\n\n");

  const globalFiles = q.files?.length ? `\nFichiers globaux: ${q.files.length}` : "";
  const consent = q.consentRgpd ? "\nConsentement RGPD: oui" : "\nConsentement RGPD: non";

  return `${header}\n\n${items}${globalFiles}${consent}`;
}

/** Format HTML (pour email / aperçu) */
export function formatQuoteHtml(q: QuoteRequest): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const customerBlock = `
    <table cellpadding="0" cellspacing="0" style="font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Ubuntu,Arial,sans-serif;width:100%;border-collapse:collapse">
      <tr><td style="padding:0 0 6px"><strong>Nom</strong></td><td style="padding:0 0 6px">${esc(
        `${q.customer.firstName} ${q.customer.lastName}`
      )}</td></tr>
      <tr><td style="padding:0 0 6px"><strong>Email</strong></td><td style="padding:0 0 6px">${esc(
        q.customer.email
      )}</td></tr>
      ${
        q.customer.phone
          ? `<tr><td style="padding:0 0 6px"><strong>Téléphone</strong></td><td style="padding:0 0 6px">${esc(
              q.customer.phone
            )}</td></tr>`
          : ""
      }
      ${
        q.customer.contactPref
          ? `<tr><td style="padding:0 0 6px"><strong>Contact</strong></td><td style="padding:0 0 6px">${esc(
              q.customer.contactPref.toLowerCase()
            )}</td></tr>`
          : ""
      }
      ${
        q.project?.budget
          ? `<tr><td style="padding:0 0 6px"><strong>Budget</strong></td><td style="padding:0 0 6px">${esc(
              label.budget[q.project.budget]
            )}</td></tr>`
          : ""
      }
      ${
        q.project?.timing
          ? `<tr><td style="padding:0 0 6px"><strong>Délai</strong></td><td style="padding:0 0 6px">${esc(
              label.timing[q.project.timing]
            )}</td></tr>`
          : ""
      }
      ${
        q.project?.address
          ? `<tr><td style="padding:0 0 6px;vertical-align:top"><strong>Adresse</strong></td><td style="padding:0 0 6px">${esc(
              [q.project.address.street, q.project.address.postalCode, q.project.address.city, q.project.address.country]
                .filter(Boolean)
                .join(", ")
            )}</td></tr>`
          : ""
      }
    </table>
  `;

  const itemsRows = q.items
    .map((it, idx) => {
      const title = `${label.storeType[it.type]} ×${it.quantity}`;
      const dims = fmtDims(it);
      const control = fmtControl(it);
      const room =
        it.room ? `${label.room[it.room]}${it.roomLabel ? ` (${it.roomLabel})` : ""}` : it.roomLabel ? it.roomLabel : "";
      const window = it.windowType ? label.window[it.windowType] : "";
      const pose = label.mount[it.mount];
      const fabric = fmtFabric(it) ?? "";
      const color = fmtColor(it) ?? "";
      const notes = it.notes ?? "";
      const files = it.files?.length ? `${it.files.length} fichier(s)` : "";

      return `
        <tr>
          <td style="padding:12px;border-top:1px solid #eee;vertical-align:top"><strong>#${idx + 1}</strong></td>
          <td style="padding:12px;border-top:1px solid #eee">
            <div style="font-weight:600;margin:0 0 6px">${esc(title)}</div>
            <div style="color:#555;margin:0 0 4px">${esc(pose)} — ${esc(control)}</div>
            <div style="margin:0 0 4px"><strong>Dimensions :</strong> ${esc(dims)}</div>
            ${room ? `<div style="margin:0 0 4px"><strong>Pièce :</strong> ${esc(room)}</div>` : ""}
            ${window ? `<div style="margin:0 0 4px"><strong>Ouverture :</strong> ${esc(window)}</div>` : ""}
            ${fabric ? `<div style="margin:0 0 4px">${esc(fabric)}</div>` : ""}
            ${color ? `<div style="margin:0 0 4px">${esc(color)}</div>` : ""}
            ${notes ? `<div style="margin:6px 0 0;color:#555"><em>${esc(notes)}</em></div>` : ""}
            ${files ? `<div style="margin:6px 0 0;color:#555">${esc(files)}</div>` : ""}
          </td>
        </tr>
      `;
    })
    .join("");

  const globalFiles = q.files?.length
    ? `<p style="margin:8px 0 0;color:#555"><strong>Fichiers globaux :</strong> ${q.files.length}</p>`
    : "";

  const consent = `<p style="margin:8px 0 0;color:#555"><strong>Consentement RGPD :</strong> ${
    q.consentRgpd ? "Oui" : "Non"
  }</p>`;

  return `
    <div style="font:14px/1.5 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Ubuntu,Arial,sans-serif;color:#111">
      <h2 style="font-size:18px;margin:0 0 10px">Demande d'estimation — ${esc(
        `${q.customer.firstName} ${q.customer.lastName}`
      )}</h2>
      ${customerBlock}
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:8px">
        ${itemsRows}
      </table>
      ${globalFiles}
      ${consent}
      <p style="margin:16px 0 0;color:#777;font-size:12px">
        Estimation indicative, sans valeur contractuelle. Un conseiller Anderlecht Décor reviendra vers vous rapidement.
      </p>
    </div>
  `.trim();
}
