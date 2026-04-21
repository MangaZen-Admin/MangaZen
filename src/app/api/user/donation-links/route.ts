import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const VALID_PLATFORMS = [
  "patreon",
  "kofi",
  "buymeacoffee",
  "paypal",
  "cafecito",
  "mercadopago",
  "apoiase",
  "fanbox",
  "fantia",
  "postype",
  "afdian",
] as const;

type Platform = (typeof VALID_PLATFORMS)[number];
const MAX_LINKS = 5;

function isValidPlatform(p: string): p is Platform {
  return (VALID_PLATFORMS as readonly string[]).includes(p);
}

// GET — listar links del usuario autenticado
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const userId = auth.userId!;

  const links = await prisma.donationLink.findMany({
    where: { userId },
    orderBy: { order: "asc" },
    select: { id: true, platform: true, url: true, order: true },
  });

  return NextResponse.json({ links });
}

// POST — agregar link
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const userId = auth.userId!;

  // Solo SCAN, CREATOR y ADMIN pueden tener donation links
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || !["SCAN", "CREATOR", "ADMIN"].includes(user.role)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const platform = typeof o.platform === "string" ? o.platform.trim() : "";
  const url = typeof o.url === "string" ? o.url.trim() : "";

  if (!isValidPlatform(platform)) {
    return NextResponse.json({ error: "INVALID_PLATFORM" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "INVALID_URL" }, { status: 400 });
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return NextResponse.json({ error: "INVALID_URL" }, { status: 400 });
  }

  // Verificar límite
  const count = await prisma.donationLink.count({ where: { userId } });
  if (count >= MAX_LINKS) {
    return NextResponse.json({ error: "MAX_LINKS_REACHED" }, { status: 409 });
  }

  // No duplicar plataforma
  const existing = await prisma.donationLink.findFirst({
    where: { userId, platform },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "PLATFORM_ALREADY_EXISTS" }, { status: 409 });
  }

  const link = await prisma.donationLink.create({
    data: { userId, platform, url, order: count },
    select: { id: true, platform: true, url: true, order: true },
  });

  return NextResponse.json({ link });
}

// DELETE — eliminar link por id
export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const userId = auth.userId!;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  const link = await prisma.donationLink.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!link) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (link.userId !== userId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await prisma.donationLink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// PATCH — actualizar url de un link existente
export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const userId = auth.userId!;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const url = typeof o.url === "string" ? o.url.trim() : "";

  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "INVALID_URL" }, { status: 400 });
  }

  const link = await prisma.donationLink.findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!link) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (link.userId !== userId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const updated = await prisma.donationLink.update({
    where: { id },
    data: { url },
    select: { id: true, platform: true, url: true, order: true },
  });

  return NextResponse.json({ link: updated });
}
