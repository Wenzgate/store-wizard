// src/app/admin/leads/page.tsx
import { promises as fs } from "node:fs";
import { join } from "node:path";
import LeadsClient from "./LeadsClient";

// Type minimal — adapte si tu as déjà un type ailleurs
export type LeadRow = {
  id: string;
  createdAt: string;
  name?: string;
  email?: string;
  phone?: string;
  projectType?: string;
  city?: string;
  // ... ajoute tes champs si besoin
};

async function getLeads(): Promise<LeadRow[]> {
  // Option simple : lire un JSON local. Si le fichier n’existe pas → []
  try {
    const p = join(process.cwd(), "data", "leads.json");
    const raw = await fs.readFile(p, "utf8");
    const parsed = JSON.parse(raw);
    // sécurité : on s’assure que c’est bien un tableau
    return Array.isArray(parsed) ? parsed as LeadRow[] : [];
  } catch {
    return [];
  }
}

export default async function Page() {
  const leads = await getLeads();
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Leads</h1>
      <LeadsClient leads={leads} />
    </main>
  );
}