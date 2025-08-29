"use client";
import { useState } from "react";

export default function AdminLoginPage() {
  const [token, setToken] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      alert("Token invalide");
      return;
    }
    location.href = "/admin/leads";
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h2 className="mb-4">Connexion admin</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Admin token"
          className="w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm"
        />
        <button className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground">
          Se connecter
        </button>
      </form>
    </main>
  );
}
