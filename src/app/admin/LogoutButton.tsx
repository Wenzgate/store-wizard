"use client";

export default function LogoutButton() {
  async function onLogout() {
    // supprime le cookie côté serveur
    await fetch("/api/admin/login", { method: "DELETE" });
    // renvoie vers login
    location.href = "/admin/login";
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      className="text-sm underline"
      aria-label="Se déconnecter"
    >
      Se déconnecter
    </button>
  );
}
