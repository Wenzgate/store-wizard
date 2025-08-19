/**
 * PDF server-side — génération simple via pdfkit (runtime Node.js).
 * Exporte: generateQuotePdf(quote) -> Buffer
 *
 * La dépendance "pdfkit" doit être installée pour un rendu effectif.
 * Sans dépendance, la fonction lève une erreur explicite.
 */

import type { QuoteRequest, StoreItem } from "@/types/quote";

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

export async function generateQuotePdf(q: QuoteRequest): Promise<Buffer> {
  let PDFDocument: any;
  try {
    // dynamic import to avoid ESM/CJS pitfalls
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    PDFDocument = require("pdfkit");
  } catch {
    throw new Error('La dépendance "pdfkit" est requise pour générer un PDF.');
  }

  const doc = new PDFDocument({ size: "A4", margin: 36 });
  const chunks: Buffer[] = [];
  return await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.fontSize(18).text("Demande d’estimation — Anderlecht Décor", { underline: false });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor("#555").text(new Date().toLocaleString("fr-BE"));
    doc.moveDown();

    // Customer
    doc.fillColor("#111").fontSize(14).text("Client", { continued: false });
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#111").text(`${q.customer.firstName} ${q.customer.lastName}`);
    doc.fillColor("#333").text(q.customer.email);
    if (q.customer.phone) doc.text(q.customer.phone);
    const addr = [q.project?.address?.street, q.project?.address?.postalCode, q.project?.address?.city, q.project?.address?.country]
      .filter(Boolean)
      .join(", ");
    if (addr) doc.text(addr);
    doc.moveDown();

    // Items
    (q.items ?? []).forEach((it, i) => {
      doc.fillColor("#111").fontSize(13).text(`Store #${i + 1} — ${labelType(it.type)} ×${it.quantity}`);
      doc.fontSize(11).fillColor("#333");
      doc.text(`Pose: ${labelMount(it.mount)}  ·  Commande: ${labelControl(it)}`);
      doc.text(
        `Dimensions: ${it.dims.width} × ${it.dims.height} cm${it.dims.toleranceCm != null ? ` (± ${it.dims.toleranceCm} cm)` : ""}`
      );
      if (it.room || it.roomLabel) doc.text(`Pièce: ${[it.room, it.roomLabel].filter(Boolean).join(" / ")}`);
      if (it.windowType) doc.text(`Ouverture: ${it.windowType}`);
      if (it.fabric) {
        const f = it.fabric;
        doc.text(
          `Tissu: ${[f.brand ?? "BANDALUX", f.collection, f.colorName, f.colorCode].filter(Boolean).join(" · ")}${
            f.opacity ? ` (${String(f.opacity).toLowerCase()})` : ""
          }${f.opennessFactorPct != null ? ` — ${f.opennessFactorPct}%` : ""}`
        );
      }
      if (it.color?.tone) doc.text(`Couleur: ${it.color.tone === "CUSTOM" ? it.color.custom ?? "Personnalisée" : it.color.tone}`);
      if (it.notes) doc.text(`Notes: ${it.notes}`);
      doc.moveDown();
    });

    // Footer
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#777").text("Estimation indicative, sans valeur contractuelle.", { align: "left" });

    doc.end();
  });
}
