// src/lib/adminAuth.ts
import type { NextRequest } from "next/server";

// Parse un cookie par son nom depuis un header Cookie brut
function getCookieFromHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((s) => s.trim());
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = p.slice(0, idx);
    const v = p.slice(idx + 1);
    if (k === name) return decodeURIComponent(v);
  }
  return null;
}

// Récupère le token admin depuis X-Admin-Token OU le cookie admin_token
function extractAdminToken(req: Request | NextRequest): string | null {
  const headerToken = req.headers.get("x-admin-token");
  if (headerToken) return headerToken;

  // NextRequest a req.cookies.get, Request standard non
  // On lit le header Cookie dans les deux cas pour être universel.
  const cookieHeader = req.headers.get("cookie");
  const cookieToken = getCookieFromHeader(cookieHeader, "admin_token");
  return cookieToken;
}

export function hasValidAdmin(req: Request | NextRequest): boolean {
  const expected = process.env.ADMIN_TOKEN ?? "";
  if (!expected) return false;
  const token = extractAdminToken(req);
  return !!token && token === expected;
}

// Helper pratique pour les route handlers
export function requireAdmin(req: Request | NextRequest): { ok: true } | { ok: false; status: number; error: string } {
  if (!process.env.ADMIN_TOKEN) {
    return { ok: false, status: 500, error: "ADMIN_TOKEN non configuré côté serveur." };
  }
  if (!hasValidAdmin(req)) {
    return { ok: false, status: 401, error: "Accès refusé. Token manquant ou invalide." };
  }
  return { ok: true };
}
