/**
 * Email HTML — Récapitulatif de demande de devis
 * Responsive (tablature simple), compatible clients majeurs.
 */

import type { QuoteRequest, StoreItem } from "@/types/quote";

const styles = `
  body{margin:0;padding:0;background:#f6f8fa;color:#111}
  .container{max-width:640px;margin:0 auto;background:#fff}
  .p{padding:16px}
  .h1{font:600 20px/1.3 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,Arial,sans-serif;margin:0 0 6px}
  .muted{color:#666}
  .btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;padding:10px 14px;font:600 14px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,Arial,sans-serif}
  .card{border:1px solid #e5e7eb;border-radius:12px;margin:10px 0;overflow:hidden}
  .row{border-top:1px solid #eee}
  table{border-collapse:collapse;width:100%}
  td{vertical-align:top;padding:10px;font:14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,Arial,sans-serif}
  .k{white-space:nowrap;color:#555;width:140px}
  .v{color:#111}
  .badge{display:inline-block;border:1px solid #e5e7eb;border-radius:999px;padding:3px 8px;font-size:12px;color:#444;margin-right:6px}
  .footer{color:#777;font:12px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Ubuntu,Arial,sans-serif;padding:14px}
  @media (max-width:540px){ .k{width:110px} .p{padding:12px} td{padding:8px} }
`;

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function labelType(v: StoreItem["type"]) {
  return (
    {
      VENETIAN: "Vénitien",
      ROMAN: "Bateau",
      ROLLER: "Enrouleur",
      PLEATED: "Plissé",
      CASSETTE: "Coffre / Box",
    } as const
  )[v];
}
function labelMount(v: StoreItem["mount"]) {
  return ({ INSIDE: "Pose tableau", OUTSIDE: "Recouvrement mural", CEILING: "Pose plafond" } as const)[v];
}
function labelControl(it: StoreItem) {
  const side = it.controlSide ? (it.controlSide === "LEFT" ? " — côté gauche" : " — côté droit") : "";
  if (it.control === "CHAIN") return "Chaînette" + side;
  if (it.control === "CRANK") return "Manivelle" + side;
  if (it.control === "MOTOR") {
    const power =
      it.motor?.power === "WIRED" ? " — filaire" : it.motor?.power === "BATTERY" ? " — batterie" : it.motor?.power === "SOLAR" ? " — solaire" : "";
    const brand = it.motor?.brand ? ` (${it.motor.brand})` : "";
    return "Motorisation" + power + brand;
  }
  return "Ressort";
}

function row(k: string, v?: string | number | null) {
  if (v == null || v === "") return "";
  return `
    <tr class="row">
      <td class="k">${esc(k)}</td>
      <td class="v">${esc(String(v))}</td>
    </tr>
  `;
}

function filesList(urls: string[]) {
  if (!urls.length) return "";
  const items = urls
    .map((u, i) => `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Fichier ${i + 1}</a></li>`)
    .join("");
  return `<ul style="margin:6px 0 0 18px;padding:0">${items}</ul>`;
}

export function renderQuoteEmailHTML(q: QuoteRequest, opts?: { adminUrl?: string; publicBaseUrl?: string }) {
  const adminUrl = opts?.adminUrl || "";
  const head = `
  <!doctype html>
  <html lang="fr">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Nouvelle demande d'estimation</title>
    <style>${styles}</style>
  </head>
  <body>
    <div class="container">
      <div class="p">
        <h1 class="h1">Nouvelle demande d’estimation</h1>
        <p class="muted">Client: ${esc(q.customer.firstName)} ${esc(q.customer.lastName)} · ${esc(q.customer.email)}${
    q.customer.phone ? " · " + esc(q.customer.phone) : ""
  }</p>
        <div>
          ${q.project?.timing ? `<span class="badge">${esc(q.project.timing)}</span>` : ""}
          ${q.project?.budget ? `<span class="badge">${esc(q.project.budget)}</span>` : ""}
          ${q.project?.address?.city ? `<span class="badge">${esc(q.project.address.city)}</span>` : ""}
        </div>
      </div>
  `;

  const contactBlock = `
    <div class="p">
      <div class="card">
        <table>
          ${row("Email", q.customer.email)}
          ${row("Téléphone", q.customer.phone || "")}
          ${row(
            "Adresse",
            [q.project?.address?.street, q.project?.address?.postalCode, q.project?.address?.city, q.project?.address?.country]
              .filter(Boolean)
              .join(", ")
          )}
          ${row("Notes projet", q.project?.notes || "")}
        </table>
      </div>
    </div>
  `;

  const items = (q.items ?? [])
    .map((it, i) => {
      const gFiles = (it.files ?? []).map((f) => f.url || "").filter(Boolean);
      return `
        <div class="p">
          <div class="card">
            <table>
              <tr>
                <td class="k">#</td>
                <td class="v"><strong>${i + 1}</strong> — ${esc(labelType(it.type))} ×${it.quantity}</td>
              </tr>
              ${row("Pose", labelMount(it.mount))}
              ${row("Commande", labelControl(it))}
              ${row(
                "Dimensions",
                `${it.dims.width} × ${it.dims.height} cm` + (it.dims.toleranceCm != null ? ` (± ${it.dims.toleranceCm} cm)` : "")
              )}
              ${row(
                "Tissu",
                it.fabric
                  ? [it.fabric.brand ?? "BANDALUX", it.fabric.collection, it.fabric.colorName, it.fabric.colorCode]
                      .filter(Boolean)
                      .join(" · ")
                  : ""
              )}
              ${row("Pièce", it.roomLabel || (it.room ? String(it.room) : ""))}
              ${row("Ouverture", it.windowType ? String(it.windowType) : "")}
              ${row("Notes", it.notes || "")}
            </table>
            ${gFiles.length ? `<div class="p">${filesList(gFiles)}</div>` : ""}
          </div>
        </div>
      `;
    })
    .join("");

  const globalFiles =
    q.files && q.files.length
      ? `
      <div class="p">
        <div class="card">
          <div class="p">
            <strong>Fichiers globaux</strong>
            ${filesList(q.files.map((f) => f.url || "").filter(Boolean))}
          </div>
        </div>
      </div>`
      : "";

  const cta =
    adminUrl &&
    `<div class="p"><a class="btn" href="${esc(adminUrl)}" target="_blank" rel="noopener noreferrer">Ouvrir dans l’admin</a></div>`;

  const footer = `
      <div class="footer">
        Estimation indicative sans valeur contractuelle. RGPD: consentement ${q.consentRgpd ? "oui" : "non"}.
      </div>
    </div>
  </body>
  </html>`;

  return head + contactBlock + items + globalFiles + (cta || "") + footer;
}
