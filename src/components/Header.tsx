import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-primary text-brand-foreground">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link href="/" className="text-lg font-bold hover:text-brand-alt">
          Anderlecht Décor
        </Link>
        <nav>
          <ul className="flex gap-4 text-sm">
            <li>
              <Link href="/devis" className="hover:text-brand-alt">
                Devis
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-brand-alt">
                Contact
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
