import "./../styles/globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Devis Stores — Anderlecht Décor", description: "Estimation stores Bandalux" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-bg text-fg min-h-screen antialiased">
        <div className="mx-auto max-w-5xl p-4">{children}</div>
      </body>
    </html>
  );
}
