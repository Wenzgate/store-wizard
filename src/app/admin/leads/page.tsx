import { PrismaClient, LeadStatus } from "@prisma/client";
import Link from "next/link";
import { Suspense } from "react";

const prisma = new PrismaClient();

type LeadRow = {
  id: string;
  createdAt: Date;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: LeadStatus;
  _count: { items: number };
};

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const leads = await prisma.quoteRequest.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
      _count: { select: { items: true } },
    },
    take: 500, // simple cap
  });

  return (
    <main className="mx-auto max-w-6xl p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Leads</h1>
        <span className="text-sm text-muted">{leads.length} résultat(s)</span>
      </header>

      <Suspense fallback={<div>Chargement…</div>}>
        <LeadsClient leads={leads} />
      </Suspense>
    </main>
  );
}

/* ---------- Client component: filters + CSV export ---------- */
"use client";
import { useMemo, useState } from "react";

function LeadsClient({ leads }: { leads: LeadRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<LeadStatus | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;

    return leads.filter((l) => {
      if (status !== "ALL" && l.status !== status) return false;
      if (ql) {
        const s = `${l.firstName} ${l.lastName} ${l.email} ${l.phone ?? ""}`.toLowerCase();
        if (!s.includes(ql)) return false;
      }
      if (from && l.createdAt < from) return false;
      if (to && l.createdAt > new Date(to.getTime() + 24 * 3600 * 1000 - 1)) return false;
      return true;
    });
  }, [leads, q, status, dateFrom, dateTo]);

  const downloadCsv = () => {
    const header = ["id", "date", "nom", "email", "tel", "nb_stores", "statut"];
    const rows = filtered.map((l) => [
      l.id,
      l.createdAt.toISOString(),
      `${l.firstName} ${l.lastName}`,
      l.email,
      l.phone ?? "",
      String(l._count.items),
      l.status,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <section className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (nom, email, tel)"
          className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          aria-label="Rechercher"
        />
        <select
          value={status}
          onChange={(e) => setStatus((e.target.value as LeadStatus | "ALL") ?? "ALL")}
          className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          aria-label="Filtre statut"
        >
          <option value="ALL">Tous statuts</option>
          <option value="NEW">NEW</option>
          <option value="IN_REVIEW">IN_REVIEW</option>
          <option value="CONTACTED">CONTACTED</option>
          <option value="WON">WON</option>
          <option value="LOST">LOST</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          aria-label="Date début"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
          aria-label="Date fin"
        />
      </section>

      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted">{filtered.length} affiché(s)</span>
        <button
          onClick={downloadCsv}
          className="rounded-xl border border-border px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/10"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Nom</th>
              <th className="px-2 py-2">Email</th>
              <th className="px-2 py-2">Téléphone</th>
              <th className="px-2 py-2"># Stores</th>
              <th className="px-2 py-2">Statut</th>
              <th className="px-2 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-b border-border">
                <td className="px-2 py-2 whitespace-nowrap">{new Date(l.createdAt).toLocaleString("fr-BE")}</td>
                <td className="px-2 py-2 whitespace-nowrap">{l.firstName} {l.lastName}</td>
                <td className="px-2 py-2">{l.email}</td>
                <td className="px-2 py-2">{l.phone ?? "—"}</td>
                <td className="px-2 py-2">{l._count.items}</td>
                <td className="px-2 py-2">{l.status}</td>
                <td className="px-2 py-2">
                  <Link
                    href={`/admin/leads/${l.id}`}
                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-muted">Aucun résultat.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
