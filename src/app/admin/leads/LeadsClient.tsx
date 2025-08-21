"use client";
import { useEffect, useState } from "react";

type Lead = {
  id: string;
  createdAt: string;
  customerEmail?: string;
  name: string;
  phone: string;
  lastName: string;
  firstName: string;
  // ... adapte à ton modèle
};

export default function LeadsClient() {
  const [data, setData] = useState<Lead[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/leads", { credentials: "include" });
        if (!res.ok) throw new Error(await res.text());
        const j = await res.json();
        setData(j.data as Lead[]);
      } catch (e: any) {
        setErr(e?.message ?? "Erreur");
      }
    })();
  }, []);

  if (err) return <p className="text-red-600">Erreur: {err}</p>;
  if (!data) return <p>Chargement…</p>;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Leads ({data.length})</h2>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {data.map((l) => (
          <li key={l.id} className="p-3">
            <a className="underline" href={`/admin/leads/${l.id}`}>
              {l.lastName} {l.firstName}
            </a>
            <div className="text-xs text-muted">{new Date(l.createdAt).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
