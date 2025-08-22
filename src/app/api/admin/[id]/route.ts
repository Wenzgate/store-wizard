// src/app/api/admin/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // ⬅️ note la Promise ici
) {
  const { id } = await params; // ⬅️ on résout la Promise

  const auth = requireAdmin(req); // si requireAdmin est async => await requireAdmin(req)
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const lead = await prisma.quoteRequest.findUnique({
    where: { id },
    include: { items: true, files: true },
  });

  if (!lead) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  return NextResponse.json({ data: lead });
}
