// src/app/api/quote/route.ts
export const dynamic = "force-dynamic";
export const maxDuration = 15; // (facultatif) Vercel serverless timeout

import { NextResponse } from "next/server";
import { QuoteRequestSchema } from "@/schemas/quote";
import type { QuoteRequest } from "@/types/quote";
import { ipFromRequest, rateLimiter } from "@/lib/ratelimit";
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
const SENDER_EMAIL = process.env.QUOTE_SENDER_EMAIL || process.env.MAIL_FROM || "no-reply@anderlechtdecor.local";

// Prisma (singleton en dev)
const prisma = (globalThis as any).__prisma ?? new PrismaClient();
if (!(globalThis as any).__prisma) (globalThis as any).__prisma = prisma;

export const runtime = "nodejs";

// ============ Optional storage (Vercel Blob) ============
type UploadFn = (file: File, path: string) => Promise<{ url: string }>;
let uploadToBlob: UploadFn | null = null;
(async () => {
  try {
    const { put } = await import("@vercel/blob");
    uploadToBlob = async (file: File, path: string) => {
      const buf = Buffer.from(await file.arrayBuffer());
      const r = await put(path, buf, {
        access: "public", // ⚠️ mettre "public" pour que les emails affichent l’image
        contentType: file.type || "application/octet-stream",
      });
      return { url: r.url };
    };
  } catch {
    // pas de blob dispo en local/dev
  }
})();

/**
 * POST /api/quote
 * ?debug=1      -> ne persiste pas / n’envoie pas d’email
 * ?imgdebug=1   -> envoie un email test avec des <img>
 *
 * Côté client :
 *  - formData.append("data", JSON.stringify(QuoteRequest sans File[]))
 *  - formData.append("rootFiles", file)
 *  - formData.append(`itemFiles_${i}`, file)
 */
export async function POST(req: Request) {
  const ip = ipFromRequest(req);

  // --- Rate limit basique
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
  } catch {}

  // --- Lire formData
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "Requête invalide: multipart/form-data attendu." }, 400);
  }

  // --- Champ JSON "data"
  const raw = form.get("data");
  if (typeof raw !== "string") {
    return json({ error: "Champ 'data' manquant (JSON sérialisé)." }, 400);
  }

  const parsed = QuoteRequestSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    return json({ error: "Validation échouée.", details: parsed.error.flatten() }, 422);
  }
  const data = parsed.data as QuoteRequest;

  // --- Honeypot anti-spam
  if ((data.honeypot ?? "") !== "") {
    return json({ id: "ok" }, 200);
  }

  // --- Flags
  const url = new URL(req.url);
  const DEBUG = url.searchParams.get("debug") === "1" || req.headers.get("x-debug") === "1";
  const IMGDEBUG = url.searchParams.get("imgdebug") === "1" || req.headers.get("x-imgdebug") === "1";

  // --- Fichiers globaux et par item
  const rootFiles = form.getAll("rootFiles").filter((x): x is File => x instanceof File);
  const itemFiles: File[][] = [];
  (data.items ?? []).forEach((_, i) => {
    const arr = form.getAll(`itemFiles_${i}`).filter((x): x is File => x instanceof File);
    itemFiles[i] = arr;
  });

  // Log rapide
  console.log("[api/quote] Files =>", {
    root: rootFiles.map((f) => f.name),
    perItem: itemFiles.map((arr, i) => ({ i, names: arr.map((f) => f.name) })),
  });

  // --- Mode DEBUG
  if (DEBUG) {
    return json({
      debug: true,
      received: data,
      files: {
        rootNames: rootFiles.map((f) => f.name),
        perItemNames: itemFiles.map((arr) => arr.map((f) => f.name)),
      },
      note: "DEBUG=1: aucune persistance ni email.",
    });
  }

  // --- Mode IMGDEBUG
  if (IMGDEBUG) {
    const html = `
      <div>
        <h1>🧪 Test Images Email</h1>
        <img src="https://picsum.photos/seed/anderlechtdecor/600/400" alt="test"/>
      </div>`;
    if (resend) {
      await resend.emails.send({
        from: SENDER_EMAIL,
        to: [RECEIVER_EMAIL],
        subject: "🧪 Test Images Email (imgdebug)",
        html,
      });
    }
    return json({ ok: true, note: "Email test images envoyé" });
  }

  // --- Mode normal
  try {
    const userAgent = req.headers.get("user-agent") ?? "";
    const referrer = req.headers.get("referer") ?? "";
    const ipHash = await sha256(`${ip}|${userAgent}`);

    // 1) Persist QuoteRequest
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
        source: (data.source as any) ?? "WEBSITE",
        locale: data.locale ?? "fr",
        referrer,
        userAgent,
        ipHash,
      },
    });

    // 2) Persist items
    const createdItems = await Promise.all(
      (data.items ?? []).map((it) =>
        prisma.storeItem.create({
          data: {
            quoteRequestId: qr.id,
            type: it.type as any,
            quantity: it.quantity,
            room: (it.room as any) ?? null,
            windowType: (it.windowType as any) ?? null,
            mount: it.mount as any,
            control: it.control as any,
            width: it.dims.width,
            height: it.dims.height,
            notes: it.notes ?? null,
          },
        })
      )
    );

    // 3) Upload / DB FileRefs
    type FileRefLite = { name: string; mime: string; size: number; url?: string | null; scope: "ROOT" | `ITEM_${number}` };
    const fileRefs: FileRefLite[] = [];

    const saveOne = async (f: File, scope: FileRefLite["scope"]) => {
      let url: string | null = null;
      if (uploadToBlob && process.env.VERCEL_BLOB_READ_WRITE_TOKEN) {
        try {
          const safeName = f.name.replace(/[^\w.\-]/g, "_");
          const path = `quotes/${qr.id}/${scope}/${Date.now()}_${safeName}`;
          const r = await uploadToBlob(f, path);
          url = r.url;
        } catch {}
      }
      fileRefs.push({ name: f.name, mime: f.type, size: f.size, url, scope });
    };

    for (const f of rootFiles) await saveOne(f, "ROOT");
    for (let i = 0; i < itemFiles.length; i++) {
      for (const f of itemFiles[i]) await saveOne(f, `ITEM_${i}`);
    }

    // DB insert
    await Promise.all(
      fileRefs.map((fr) =>
        prisma.fileRef.create({
          data:
            fr.scope === "ROOT"
              ? {
                  quoteRequestId: qr.id,
                  name: fr.name,
                  mime: mimeToEnum(fr.mime),
                  size: fr.size,
                  url: fr.url ?? null,
                }
              : {
                  storeItemId: createdItems[parseInt(fr.scope.split("_")[1])].id,
                  name: fr.name,
                  mime: mimeToEnum(fr.mime),
                  size: fr.size,
                  url: fr.url ?? null,
                },
        })
      )
    );

    // 4) Préparer email
    const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").replace(/\/+$/, "");
    const adminUrl = base ? `${base}/admin/leads/${qr.id}` : "";
    const urlsPubliques = fileRefs.map((fr) => fr.url || "").filter(isHttpsAbsolute);

    const emailHtml = renderQuoteEmailHTML(
      { ...data, id: qr.id },
      { adminUrl, publicBaseUrl: base, imageUrls: urlsPubliques } as any
    );

    // Attachments
    const allFilesFlat: File[] = [...rootFiles, ...itemFiles.flat()];
    const attachments =
      allFilesFlat.length > 0
        ? await Promise.all(
            allFilesFlat.map(async (f) => ({
              filename: f.name,
              content: Buffer.from(await f.arrayBuffer()).toString("base64"),
            }))
          )
        : [];

    // PDF (optionnel)
    try {
      const pdf = await generateQuotePdf({ ...data, id: qr.id });
      const tmpFile = join(os.tmpdir(), `quote-${qr.id}.pdf`);
      await writeFile(tmpFile, pdf);
      // attachments.push({ filename: `devis-${qr.id}.pdf`, content: pdf.toString("base64") });
    } catch (e) {
      console.warn("[api/quote] PDF non généré:", (e as any)?.message);
    }

    // Envoi email
    if (resend) {
      await resend.emails.send({
        from: SENDER_EMAIL,
        to: [RECEIVER_EMAIL],
        subject: `Nouvelle demande #${qr.id.slice(0, 8)}`,
        html: emailHtml,
        attachments,
      });
      try {
        // await resend.emails.send(...)
        console.log("[quote] email sent");
      } catch (e) {
        console.error("[quote] email error", e);
      }
      console.log("[env] has DB:", !!process.env.DATABASE_URL, 
        "has RESEND:", !!process.env.RESEND_API_KEY);

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
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

async function sha256(s: string): Promise<string> {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function mimeToEnum(m: string): any {
  switch (m) {
    case "image/jpeg": return "image_jpeg";
    case "image/png": return "image_png";
    case "image/webp": return "image_webp";
    case "application/pdf": return "application_pdf";
    default: return "application_octetstream";
  }
}

function isHttpsAbsolute(u: string | null | undefined): boolean {
  if (!u) return false;
  try {
    const x = new URL(u);
    return x.protocol === "https:";
  } catch { return false; }
}

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
