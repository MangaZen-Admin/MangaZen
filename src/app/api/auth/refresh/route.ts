import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";

export async function POST() {
  const cookieStore = await cookies();
  const headerList = await headers();
  const auth = await authenticateRequestWithRotation(cookieStore, headerList);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;

  return NextResponse.json({ ok: true });
}

