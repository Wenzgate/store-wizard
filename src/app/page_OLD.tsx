import Link from "next/link";
export default function HomePage() {
  return (
    <main className="space-y-4">
      <h1>Anderlecht Décor — Devis Stores</h1>
      <p className="text-muted">Démarrez votre demande en ligne (2–3 min).</p>
      <Link
        href="/devis"
        className="inline-block rounded-xl bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand"
      >
        Commencer le devis
      </Link>
    </main>
  );
}
