import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const rows = await prisma.quoteRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { items: true, files: true },
  });

  // 👉 annotation sur r
  const data = rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    firstName: r.firstName,
    lastName: r.lastName,
    createdAt: r.createdAt,
    customerEmail: (r as any).customerEmail ?? r.customer?.email ?? null,
    itemsCount: r.items?.length ?? 0,
  }));

  return NextResponse.json({ data });
}
