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
const SENDER_EMAIL = process.env.QUOTE_SENDER_EMAIL || process.env.MAIL_FROM || "no-reply@anderlechtdecor.local";

// Prisma (singleton en dev)
const prisma = (globalThis as any).__prisma ?? new PrismaClient();
if (!(globalThis as any).__prisma) (globalThis as any).__prisma = prisma;

export const runtime = "nodejs";

/**
 * POST /api/quote
 * ?debug=1      -> ne persiste pas / n’envoie pas d’email, renvoie tout ce qui a été reçu + fichiers validés
 * ?imgdebug=1   -> ENVOIE un email "test images" (sans passer par renderQuoteEmailHTML) pour voir si les <img> s’affichent
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
  } catch {
    // pas bloquant
  }

  // --- Lecture JSON
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Requête invalide: JSON attendu." }, 400);
  }

  // --- Validation Zod (strict)
  const parsed = QuoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Validation échouée.", details: parsed.error.flatten() }, 422);
  }
  const data = parsed.data as QuoteRequest;

  // --- Honeypot anti‑spam
  if ((data.honeypot ?? "") !== "") {
    return json({ id: "ok" }, 200);
  }

  // --- Flags
  const url = new URL(req.url);
  const DEBUG = url.searchParams.get("debug") === "1" || req.headers.get("x-debug") === "1";
  const IMGDEBUG = url.searchParams.get("imgdebug") === "1" || req.headers.get("x-imgdebug") === "1";

  // --- Validation & collecte des fichiers (métadonnées)
  let filesMeta: ReturnType<typeof validateAllFiles>;
  try {
    filesMeta = validateAllFiles(data);
  } catch (e: any) {
    return json({ error: e?.message ?? "Erreur fichiers." }, 400);
  }

  // --- Log lisible
  try {
    const g = filesMeta.globals;
    const perItemCounts = Object.fromEntries(
      Object.entries(filesMeta.perItem).map(([k, arr]) => [k, arr.length])
    );
    console.log("[api/quote] Files summary =>", {
      globalsCount: g.length,
      globalsNames: g.map(f => f.name),
      perItemCounts,
      // IMPORTANT: on logge les URLs telles qu'on les a (pour comprendre pourquoi ça casse)
      globalsUrls: g.map(f => f.url),
      perItemUrls: Object.fromEntries(
        Object.entries(filesMeta.perItem).map(([k, arr]) => [k, arr.map(f => f.url)])
      ),
    });
  } catch {}

  // --- Mode DEBUG : on renvoie tel quel (aucune DB, aucun email)
  if (DEBUG) {
    return json({
      debug: true,
      received: data,
      validatedFiles: filesMeta,
      note: "DEBUG=1: aucune persistance ni email. Regarde dans validatedFiles.globals/perItem les URLs: elles DOIVENT être absolues en HTTPS pour s’afficher en email.",
    }, 200);
  }

  // --- En mode "IMGDEBUG", on envoie un email de TEST IMAGES (sans DB) pour vérifier l’affichage <img>
  if (IMGDEBUG) {
    const publicBase = (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").replace(/\/+$/, "");
    // On ne garde que des URLs ABSOLUES HTTPS (les clients mail bloquent http/relative/file)
    const allUrls = [
      // image publique de test
      "https://picsum.photos/seed/anderlechtdecor/600/400",
      // toutes les supposées URLs d’images "globales"
      ...(filesMeta.globals ?? []).map(f => f.url || "").filter(u => isHttpsAbsolute(u)),
      // toutes les supposées URLs d’images par item
      ...Object.values(filesMeta.perItem).flat().map(f => f.url || "").filter(u => isHttpsAbsolute(u)),
    ];

    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
        <h1>🧪 Test Images Email</h1>
        <p>But : vérifier si les clients mail chargent bien des <code>&lt;img src="https://..."&gt;</code>.</p>
        <ol>
          ${allUrls.map(u => `
            <li style="margin-bottom:16px">
              <div>URL: <a href="${u}" target="_blank" rel="noreferrer">${escapeHtml(u)}</a></div>
              <div style="margin-top:8px">
                <img src="${u}" alt="test-img" style="max-width:560px;border:1px solid #ddd;border-radius:8px"/>
              </div>
            </li>
          `).join("")}
        </ol>
        ${!publicBase ? `<p style="color:#b00">⚠️ NEXT_PUBLIC_SITE_URL n’est pas configurée → tes URLs risquent d’être relatives / locales.</p>` : ""}
        <p style="margin-top:24px;color:#666">Si une image est cassée ici, son URL n’est pas publiquement accessible en HTTPS.</p>
      </div>
    `;

    try {
      if (resend) {
        await resend.emails.send({
          from: SENDER_EMAIL,
          to: [RECEIVER_EMAIL],
          subject: "🧪 Test Images Email (imgdebug)",
          html,
        });
      } else {
        console.log("[email:stub IMGDEBUG] To:", RECEIVER_EMAIL);
        console.log(html.slice(0, 800) + "...");
      }
      return json({ ok: true, note: "Email de test images envoyé. Ouvre-le sur ton client mail et regarde si les images s’affichent." }, 200);
    } catch (e: any) {
      console.warn("[api/quote] Envoi email (imgdebug) échoué:", e?.message);
      return json({ error: "Échec envoi email test images", details: e?.message }, 500);
    }
  }

  // --- Mode normal : on persiste, puis on envoie l’email “vrai”
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

    // Stockage des fichiers (stub dev)
    const { globals, perItem } = filesMeta;
    await storeFilesDev([...globals, ...Object.values(perItem).flat()]);

    // Liens de fichiers en DB
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

    // Email + PDF
    const publicBase = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "";
    const base = publicBase ? publicBase.replace(/\/+$/, "") : "";
    const adminUrl = base ? `${base}/admin/leads/${qr.id}` : "";

    // On passe des URLs publiques (si dispo) dans le contexte pour les afficher dans l’email.
    const urlsPublics: string[] = [
      ...(globals ?? []).map(f => f.url || "").filter(u => isHttpsAbsolute(u)),
      ...Object.values(perItem).flat().map(f => f.url || "").filter(u => isHttpsAbsolute(u)),
    ];

    console.log("[api/quote] URLs publiques pour email:", urlsPublics);

    const emailHtml = renderQuoteEmailHTML(
      { ...data, id: qr.id },
      { adminUrl, publicBaseUrl: base, imageUrls: urlsPublics } as any
    );

    // Génère le PDF (best-effort)
    try {
      const pdf = await generateQuotePdf({ ...data, id: qr.id });
      const tmpFile = join(os.tmpdir(), `quote-${qr.id}.pdf`);
      await writeFile(tmpFile, pdf);
    } catch (e) {
      console.warn("[api/quote] PDF non généré:", (e as any)?.message);
    }

    // Envoi e‑mail
    try {
      if (resend) {
        await resend.emails.send({
          from: SENDER_EMAIL,
          to: [RECEIVER_EMAIL],
          subject: `Nouvelle demande d’estimation #${qr.id.slice(0, 8)}`,
          html: emailHtml,
          // NOTE: si tes images n’ont PAS d’URL publiques, les clients mail ne pourront pas les charger.
          // Resend ne gère pas les cid inline comme Nodemailer — donc privilégie des URLs HTTPS publiques.
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

function isHttpsAbsolute(u: string | null | undefined): boolean {
  if (!u) return false;
  try {
    const x = new URL(u);
    return x.protocol === "https:";
  } catch {
    return false;
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
