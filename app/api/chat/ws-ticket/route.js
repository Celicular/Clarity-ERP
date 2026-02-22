/**
 * app/api/chat/ws-ticket/route.js
 * Returns the raw JWT from the HTTP-only cookie so the browser
 * can pass it as a query param when upgrading to WebSocket.
 * (document.cookie can't read HTTP-only cookies directly.)
 */
import { NextResponse } from "next/server";
import { cookies }      from "next/headers";
import { getSession }   from "../../../../lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookieStore = await cookies();
  const token = cookieStore.get("clarity_token")?.value;

  if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });
  return NextResponse.json({ token });
}
