import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  const cookieStore = await cookies();
  const { userId } = await authenticateRequestWithRotation(cookieStore, request.headers);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user || user.role !== "ADMIN") return null;
  return userId;
}

export async function GET(request: Request) {
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const announcements = await prisma.announcement.findMany({
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
  });

  return NextResponse.json({ announcements });
}

export async function POST(request: Request) {
  const adminId = await requireAdmin(request);
  if (!adminId) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title.trim() : "";
  const bodyText = typeof o.body === "string" ? o.body.trim() : "";
  const imageUrl =
    typeof o.imageUrl === "string" && o.imageUrl.trim() ? o.imageUrl.trim() : null;
  const isPinned = o.isPinned === true;

  if (!title || !bodyText) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const announcement = await prisma.announcement.create({
    data: { title, body: bodyText, imageUrl, isPinned },
  });

  return NextResponse.json({ announcement });
}
