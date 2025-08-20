import { NextResponse } from "next/server";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return new NextResponse(JSON.stringify({ error: "multipart/form-data requis" }), { status: 400 });
  }

  const form = await req.formData();
  const files = form.getAll("files") as File[];

  if (!files.length) {
    return new NextResponse(JSON.stringify({ error: "Aucun fichier" }), { status: 400 });
  }

  const saved = [];
  for (const f of files) {
    const arrayBuffer = await f.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);

    // hash pour référence
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");

    // on écrit dans un tmp cross‑platform (en prod -> S3/GCS)
    const tmpPath = join(os.tmpdir(), `${Date.now()}-${sha256}-${f.name}`);
    await writeFile(tmpPath, buf);

    // on renvoie une URL “file://” de dev (ton storeFilesDev peut la gérer),
    // ou une URL signée S3 en prod.
    const url = `file://${tmpPath}`;

    saved.push({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      mime: f.type || "application/octet-stream",
      url,
      sha256,
    });
  }

  return new NextResponse(JSON.stringify({ files: saved }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
