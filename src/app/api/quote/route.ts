// src/app/api/quote/route.ts
import { NextResponse } from "next/server";
import { QuoteRequestSchema } from "@/schemas/quote";
import type { QuoteRequest } from "@/types/quote";
import { ipFromRequest, rateLimiter } from "@/lib/ratelimit";
import { validateAllFiles, storeFilesDev } from "@/lib/upload";
import { PrismaClient } from "@prisma/client";
import { renderQuoteEmailHTML } from "@/emails/quote-recap";
import { generateQuotePdf } from "@/server/pdf";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { Resend } from "resend";

// ===== Email config =====
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const RECEIVER_EMAIL = process.env.QUOTE_RECEIVER_EMAIL || process.env.ADMIN_EMAIL || "anderlechtdecor@hotmail.com";
const SENDER_EMAIL =
  process.env.QUOTE_SENDER_EMAIL || process.env.MAIL_FROM || "no-reply@anderlechtdecor.local";

// Prisma (singleton in dev)
const prisma = (globalThis as any).__prisma ?? new PrismaClient();
if (!(globalThis as any).__prisma) (globalThis as any).__prisma = prisma;

export const runtime = "nodejs";

/**
 * POST /api/quote — crée une demande, stocke DB, fichiers, PDF et envoie un e‑mail
 */
export async function POST(req: Request) {
  const ip = ipFromRequest(req);

  // --- Rate limit basique (1 token / req)
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
    // on ignore les erreurs de limiter pour ne pas bloquer la route
  }

  // --- Lecture JSON
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Requête invalide: JSON attendu." }, 400);
  }

  // --- Validation Zod
  const parsed = QuoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Validation échouée.", details: parsed.error.flatten() }, 422);
  }
  const data = parsed.data as QuoteRequest;

  // --- Honeypot anti‑spam
  if ((data.honeypot ?? "") !== "") {
    return json({ id: "ok" }, 200);
  }

  // --- Validation & collecte des fichiers (métadonnées)
  let filesMeta: ReturnType<typeof validateAllFiles>;
  try {
    filesMeta = validateAllFiles(data);
  } catch (e: any) {
    return json({ error: e?.message ?? "Erreur fichiers." }, 400);
  }

  try {
    const userAgent = req.headers.get("user-agent") ?? "";
    const referrer = req.headers.get("referer") ?? req.headers.get("referrer") ?? "";
    const ipHash = await sha256(`${ip}|${userAgent}`);

    // --- Persist QuoteRequest
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

    // --- Persist items
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

    // --- Stockage de fichiers (stub dev)
    const { globals, perItem } = filesMeta;
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
      const key = data.items?.[idx]?.id ?? "";
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

    // --- Email + PDF
    const publicBase = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";
    const base = publicBase ? publicBase.replace(/\/+$/, "") : "";
    const adminUrl = base ? `${base}/admin/leads/${qr.id}` : "";
    const emailHtml = renderQuoteEmailHTML({ ...data, id: qr.id }, { adminUrl, publicBaseUrl: base });

    // Génère le PDF dans un répertoire tmp portable
    try {
      const pdf = await generateQuotePdf({ ...data, id: qr.id });
      const tmpFile = join(os.tmpdir(), `quote-${qr.id}.pdf`);
      await writeFile(tmpFile, pdf);
      // tu peux persister le chemin si besoin
    } catch (e) {
      console.warn("[api/quote] PDF non généré:", (e as any)?.message);
    }

    // Envoi e‑mail (Resend si configuré, sinon fallback console)
    try {
      if (resend) {
        await resend.emails.send({
          from: SENDER_EMAIL,
          to: [RECEIVER_EMAIL],
          subject: `Nouvelle demande d’estimation #${qr.id.slice(0, 8)}`,
          html: emailHtml,
        });
      } else {
        console.log("[email:stub] To:", RECEIVER_EMAIL);
        console.log(emailHtml.slice(0, 600) + "...");
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
      return "application_octetstream";
  }
}
