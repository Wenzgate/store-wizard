// src/app/admin/leads/LeadsClient.tsx
"use client";

import { useMemo, useState } from "react";
import type { LeadRow } from "./page";

export default function LeadsClient({ leads }: { leads: LeadRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return leads;
    return leads.filter((l) => {
      const hay = [
        l.name,
        l.email,
        l.phone,
        l.projectType,
        l.city,
        l.id,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(query);
    });
  }, [q, leads]);

  function exportCSV() {
    const header = ["id","createdAt","name","email","phone","projectType","city"];
    const rows = filtered.map(l => [
      l.id,
      l.createdAt,
      l.name ?? "",
      l.email ?? "",
      l.phone ?? "",
      l.projectType ?? "",
      l.city ?? "",
    ]);
    const csv = [header, ...rows].map(r =>
      r.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g, "-");
    a.download = `leads-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (nom, email, ville, type...)"
          className="w-full rounded-lg border px-3 py-2"
        />
        <button
          type="button"
          onClick={exportCSV}
          className="rounded-lg border px-4 py-2 hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Nom</th>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Téléphone</th>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Ville</th>
              <th className="py-2 pr-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-b">
                <td className="py-2 pr-3">{l.createdAt?.slice(0,10)}</td>
                <td className="py-2 pr-3">{l.name ?? "—"}</td>
                <td className="py-2 pr-3">{l.email ?? "—"}</td>
                <td className="py-2 pr-3">{l.phone ?? "—"}</td>
                <td className="py-2 pr-3">{l.projectType ?? "—"}</td>
                <td className="py-2 pr-3">{l.city ?? "—"}</td>
                <td className="py-2 pr-3 text-xs text-gray-500">{l.id}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">
                  Aucun lead.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
