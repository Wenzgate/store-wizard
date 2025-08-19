import { NextResponse } from "next/server";
import { QuoteRequestSchema } from "@/schemas/quote";
import type { QuoteRequest } from "@/types/quote";
import { ipFromRequest, rateLimiter } from "@/lib/ratelimit";
import { validateAllFiles, storeFilesDev } from "@/lib/upload";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { renderQuoteEmailHTML } from "@/emails/quote-recap";
import { generateQuotePdf } from "@/server/pdf";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

// src/app/api/quote/route.ts
import { NextResponse } from "next/server";
import { QuoteRequestSchema } from "@/schemas/quote";

// (Optionnel) Email via Resend
// pnpm add resend  (ou npm i resend / yarn add resend)
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const RECEIVER_EMAIL = process.env.QUOTE_RECEIVER_EMAIL || "anderlechtdecor@hotmail.com";
const SENDER_EMAIL = process.env.QUOTE_SENDER_EMAIL || "contact@mika-cornelis.be";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Honeypot anti-spam
    if (body?.honeypot) {
      return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
    }

    // Validation stricte Zod (utilise ton schéma partagé)
    const parsed = QuoteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Validation error", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const quote = parsed.data;

    // Log serveur pour debug
    console.log("[API] Quote reçu:", {
      customer: quote.customer,
      items: quote.items?.length ?? 0,
      project: quote.project,
    });

    // Envoi email si Resend configuré
    if (resend) {
      const subject = `Nouvelle demande de devis (${quote.customer.firstName} ${quote.customer.lastName})`;
      const text = renderTextEmail(quote);
      // HTML minimal safe; tu peux faire mieux si tu veux
      const html = `<pre style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; white-space:pre-wrap">${escapeHtml(
        text
      )}</pre>`;

      await resend.emails.send({
        from: SENDER_EMAIL,
        to: RECEIVER_EMAIL,
        subject,
        text,
        html,
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[API] /api/quote error:", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

// --- helpers ---
function renderTextEmail(q: any) {
  const addr = [
    q.project?.address?.street,
    q.project?.address?.postalCode,
    q.project?.address?.city,
    q.project?.address?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const items =
    (q.items ?? [])
      .map((it: any, i: number) => {
        const dims = it?.dims ? `${it.dims.width} x ${it.dims.height} cm` : "-";
        return [
          `#${i + 1}`,
          `Type: ${it.type}`,
          `Qté: ${it.quantity}`,
          `Pose: ${it.mount}`,
          `Commande: ${it.control}`,
          `Dimensions: ${dims}`,
          it.notes ? `Notes: ${it.notes}` : undefined,
        ]
          .filter(Boolean)
          .join(" | ");
      })
      .join("\n") || "(aucun item)";

  return [
    `Nouvelle demande de devis — Anderlecht Décor`,
    ``,
    `Client: ${q.customer?.firstName || "-"} ${q.customer?.lastName || "-"} (${q.customer?.email || "-"})`,
    `Téléphone: ${q.customer?.phone || "-"}`,
    ``,
    `Adresse: ${addr || "-"}`,
    `Timing: ${q.project?.timing || "-"}`,
    `Budget: ${q.project?.budget || "-"}`,
    ``,
    `Items (${q.items?.length || 0}):`,
    items,
    ``,
    `Notes projet: ${q.project?.notes || "-"}`,
    ``,
    `Consent RGPD: ${q.consentRgpd ? "oui" : "non"} | Estimation indicative: ${q.acceptEstimateOnly ? "oui" : "non"}`,
    ``,
    `Payload JSON:`,
    JSON.stringify(q, null, 2),
  ].join("\n");
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}


localStorage.setItem("last_quote", JSON.stringify(parsed.data));




const prisma = globalThis.__prisma ?? new PrismaClient();
if (!(globalThis as any).__prisma) (globalThis as any).__prisma = prisma;

export const runtime = "nodejs";

/** POST /api/quote — create a quote request, send email, save PDF (dev) */
export async function POST(req: Request) {
  const ip = ipFromRequest(req);

  // Rate limit (1 token / req)
  try {
    const r = await rateLimiter.consume(ip, 1);
    if (!r.allowed) {
      return json(
        { error: "Trop de requêtes. Réessayez plus tard." },
        429,
        {
          "Retry-After": String(Math.ceil((r.retryAfterMs ?? 30_000) / 1000)),
          "X-RateLimit-Remaining": String(r.remaining),
        }
      );
    }
  } catch {
    // ignore limiter errors
  }

  // Read JSON body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Requête invalide: JSON attendu." }, 400);
  }

  // Parse with Zod
  const parsed = QuoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Validation échouée.", details: parsed.error.flatten() }, 422);
  }
  const data = parsed.data as QuoteRequest;

  // Honeypot
  if ((data.honeypot ?? "") !== "") {
    return json({ id: "ok" }, 200);
  }

  // Validate file metadata
  try {
    validateAllFiles(data);
  } catch (e: any) {
    return json({ error: e?.message ?? "Erreur fichiers." }, 400);
  }

  try {
    const userAgent = req.headers.get("user-agent") ?? "";
    const referrer = req.headers.get("referer") ?? req.headers.get("referrer") ?? "";
    const ipHash = await sha256(`${ip}|${userAgent}`);

    // Persist QuoteRequest
    const qr = await prisma.quoteRequest.create({
      data: {
        firstName: data.customer.firstName,
        lastName: data.customer.lastName,
        email: data.customer.email,
        phone: data.customer.phone ?? null,
        contactPref: (data.customer.contactPref as any) ?? null,
        budget: (data.project?.budget as any) ?? null,
        timing: (data.project?.timing as any) ?? null,
        street: data.project?.address?.street ?? null,
        postalCode: data.project?.address?.postalCode ?? null,
        city: data.project?.address?.city ?? null,
        country: data.project?.address?.country ?? null,
        notes: data.project?.notes ?? null,
        consentRgpd: data.consentRgpd,
        acceptEstimateOnly: data.acceptEstimateOnly ?? null,
        honeypot: data.honeypot ?? null,
        source: (data.source as any) ?? "WEBSITE",
        locale: data.locale ?? "fr",
        referrer,
        userAgent,
        ipHash,
      },
    });

    // Persist items
    const createdItems = await Promise.all(
      (data.items ?? []).map((it) =>
        prisma.storeItem.create({
          data: {
            quoteRequestId: qr.id,
            type: it.type as any,
            quantity: it.quantity,
            room: (it.room as any) ?? null,
            roomLabel: it.roomLabel ?? null,
            windowType: (it.windowType as any) ?? null,
            mount: it.mount as any,
            control: it.control as any,
            controlSide: (it.controlSide as any) ?? null,
            motorBrand: it.motor?.brand ?? null,
            motorPower: (it.motor?.power as any) ?? null,
            motorNotes: it.motor?.notes ?? null,
            fabricBrand: it.fabric?.brand ?? null,
            fabricCollection: it.fabric?.collection ?? null,
            fabricColorName: it.fabric?.colorName ?? null,
            fabricColorCode: it.fabric?.colorCode ?? null,
            fabricOpennessPct: it.fabric?.opennessFactorPct ?? null,
            fabricOpacity: (it.fabric?.opacity as any) ?? null,
            colorTone: it.color?.tone ?? null,
            colorCustom: it.color?.custom ?? null,
            width: it.dims.width,
            height: it.dims.height,
            toleranceCm: it.dims.toleranceCm ?? null,
            notes: it.notes ?? null,
          },
        })
      )
    );

    // Files (dev stub storage)
    const { globals, perItem } = validateAllFiles(data);
    await storeFilesDev([...globals, ...Object.values(perItem).flat()]);

    const globalFilesCreate = globals.map((f) =>
      prisma.fileRef.create({
        data: {
          quoteRequestId: qr.id,
          name: f.name,
          mime: mimeToEnum(f.mime),
          size: f.size,
          url: f.url,
          sha256: f.sha256 ?? null,
        },
      })
    );

    const perItemFilesCreate = createdItems.flatMap((created, idx) => {
      const key = data.items[idx]?.id ?? "";
      const files = perItem[key] ?? [];
      return files.map((f) =>
        prisma.fileRef.create({
          data: {
            storeItemId: created.id,
            name: f.name,
            mime: mimeToEnum(f.mime),
            size: f.size,
            url: f.url,
            sha256: f.sha256 ?? null,
          },
        })
      );
    });

    await Promise.all([...globalFilesCreate, ...perItemFilesCreate]);

    // Prepare email + PDF
    const adminBase = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";
    const adminUrl = adminBase ? `${adminBase.replace(/\/+$/, "")}/admin/leads/${qr.id}` : "";
    const emailHtml = renderQuoteEmailHTML(
      { ...data, id: qr.id },
      { adminUrl, publicBaseUrl: adminBase || "" }
    );

    // Generate PDF and save to /tmp (dev)
    try {
      const pdf = await generateQuotePdf({ ...data, id: qr.id });
      const p = join("/tmp", `quote-${qr.id}.pdf`);
      await writeFile(p, pdf);
      // (Optionnel) on pourrait attacher ce chemin dans la DB si besoin
    } catch (e) {
      console.warn("[api/quote] PDF non généré:", (e as any)?.message);
    }

    // Send email (stub if missing config)
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      const from = process.env.MAIL_FROM || "no-reply@ anderlechtdecor.local";
      const resendKey = process.env.RESEND_API_KEY;

      if (adminEmail && resendKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [adminEmail],
            subject: `Nouvelle demande d’estimation #${qr.id.slice(0, 8)}`,
            html: emailHtml,
          }),
        });
      } else {
        console.log("[email:stub] To:", adminEmail ?? "(unset)");
        console.log(emailHtml.slice(0, 500) + "...");
      }
    } catch (e) {
      console.warn("[api/quote] Envoi email échoué:", (e as any)?.message);
    }

    return json({ id: qr.id }, 201);
  } catch (e: any) {
    console.error("[api/quote] error", e);
    return json({ error: "Erreur serveur lors de l'enregistrement de la demande." }, 500);
  }
}

/* ----------------- Helpers ----------------- */

function json(data: unknown, status = 200, headers?: Record<string, string>) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

async function sha256(s: string): Promise<string> {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function mimeToEnum(m: string): any {
  switch (m) {
    case "image/jpeg":
      return "image_jpeg";
    case "image/png":
      return "image_png";
    case "image/webp":
      return "image_webp";
    case "application/pdf":
      return "application_pdf";
    default:
      return "application_pdf";
  }
}
