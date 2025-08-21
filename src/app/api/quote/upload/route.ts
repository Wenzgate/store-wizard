// src/app/api/upload/route.ts
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "edge"; // Blob = Edge Runtime

export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("files") as File[];

  if (!files?.length) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }

  const results = [];

  for (const f of files) {
    const blob = await put(f.name, f, {
      access: "public", // 🔑 très important pour avoir une URL publique
    });

    results.push({
      name: f.name,
      mime: f.type,
      size: f.size,
      url: blob.url, // ✅ URL utilisable direct dans l’admin/email
    });
  }

  return NextResponse.json(results);
}
