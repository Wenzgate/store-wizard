export default function Footer() {
  return (
    <footer className="mt-8 bg-primary-alt text-brand-foreground">
      <div className="mx-auto max-w-5xl p-4 text-sm">
        <p>Anderlecht Décor • Rue Exemple 1, 1000 Bruxelles</p>
        <p>
          <a href="mailto:contact@example.com" className="hover:text-brand">
            contact@example.com
          </a>
        </p>
        <div className="mt-2 flex gap-4">
          <a href="#" aria-label="Twitter" className="hover:text-brand">
            Twitter
          </a>
          <a href="#" aria-label="Facebook" className="hover:text-brand">
            Facebook
          </a>
        </div>
        <p className="mt-2 text-xs">© {new Date().getFullYear()} Anderlecht Décor. Tous droits réservés.</p>
      </div>
    </footer>
  );
}
