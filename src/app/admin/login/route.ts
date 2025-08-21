// import { NextResponse } from "next/server";

// export async function POST(req: Request) {
//   const { token } = await req.json().catch(() => ({}));
//   const expected = process.env.ADMIN_TOKEN ?? "";
//   if (!token || token !== expected) {
//     return NextResponse.json({ error: "Token invalide" }, { status: 401 });
//   }
//   const res = NextResponse.json({ ok: true });
//   res.cookies.set("admin_token", token, {
//     httpOnly: true,
//     sameSite: "lax",
//     path: "/",
//     maxAge: 60 * 60 * 24 * 7, // 7j
//   });
//   return res;
// }
