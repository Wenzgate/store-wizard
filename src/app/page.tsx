import Link from "next/link";
export default function HomePage() {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">Anderlecht Décor — Devis Stores</h1>
      <p className="text-muted">Démarrez votre demande en ligne (2–3 min).</p>
      <Link href="/devis" className="inline-block rounded-xl bg-[hsl(var(--brand))] px-5 py-2 text-sm font-semibold text-[hsl(var(--brand-foreground))]">Commencer le devis</Link>
    </main>
  );
}
