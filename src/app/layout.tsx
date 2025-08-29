import "./../styles/globals.css";
import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Devis Stores — Anderlecht Décor", description: "Estimation stores Bandalux" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-bg text-fg min-h-screen antialiased flex flex-col">
        <Header />
        <div className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
