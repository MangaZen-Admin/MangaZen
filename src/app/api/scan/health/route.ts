import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { requireScanAccess } from "@/lib/scan-access";

/** Comprueba sesión y rol para el Panel Scan (SCAN, CREATOR o ADMIN). */
export async function GET() {
  const gate = await requireScanAccess(await headers());
  if (!gate.ok) return gate.response;
  return NextResponse.json({ ok: true, role: gate.user.role });
}
