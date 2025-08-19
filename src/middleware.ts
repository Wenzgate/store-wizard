import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/admin/:path*"],
};

/**
 * Simple header-based admin protection.
 * Client must send:  X-Admin-Token: <process.env.ADMIN_TOKEN>
 */
export function middleware(req: NextRequest) {
  const token = process.env.ADMIN_TOKEN || "";
  const header = req.headers.get("x-admin-token") || "";

  if (!token) {
    return new NextResponse(
      JSON.stringify({ error: "ADMIN_TOKEN non configuré côté serveur." }),
      { status: 500, headers: { "content-type": "application/json; charset=utf-8" } }
    );
  }

  if (header !== token) {
    return new NextResponse(
      JSON.stringify({ error: "Accès refusé. Header X-Admin-Token manquant ou invalide." }),
      {
        status: 401,
        headers: {
          "www-authenticate": 'Token realm="admin", charset="UTF-8"',
          "content-type": "application/json; charset=utf-8",
        },
      }
    );
  }

  return NextResponse.next();
}
