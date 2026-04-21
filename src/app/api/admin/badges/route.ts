import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { BADGE_ICON_KEYS } from "@/lib/badges/badge-icons";
import { isBadgeTriggerType, badgeTriggerShowsThreshold } from "@/lib/badges/badge-trigger-types";

async function requireAdmin(headerList: Headers) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, headerList);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return { ok: false as const, response: unauth };
  const userId = auth.userId!;
  const admin = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!admin || admin.role !== "ADMIN") {
    return { ok: false as const, response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }
  return { ok: true as const };
}

const badgeSelect = {
  id: true,
  name: true,
  description: true,
  iconUrl: true,
  iconKey: true,
  isHighlighted: true,
  triggerType: true,
  triggerThreshold: true,
} as const;

export async function GET() {
  const gate = await requireAdmin(await headers());
  if (!gate.ok) return gate.response;

  const rows = await prisma.badge.findMany({
    orderBy: { name: "asc" },
    select: badgeSelect,
  });

  return NextResponse.json({ badges: rows });
}

type CreateBody = {
  name?: string;
  description?: string;
  iconUrl?: string | null;
  iconKey?: string | null;
  isHighlighted?: boolean;
  triggerType?: string | null;
  triggerThreshold?: number | null;
};

export async function POST(request: Request) {
  const gate = await requireAdmin(request.headers);
  if (!gate.ok) return gate.response;

  const body = (await request.json()) as CreateBody;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (name.length < 2 || description.length < 4) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  let iconUrl: string | null = null;
  if (typeof body.iconUrl === "string") {
    const u = body.iconUrl.trim();
    iconUrl = u.length > 0 ? u : null;
  }

  let iconKey: string | null = null;
  if (typeof body.iconKey === "string" && body.iconKey.trim().length > 0) {
    const k = body.iconKey.trim();
    if (!BADGE_ICON_KEYS.includes(k)) {
      return NextResponse.json({ error: "INVALID_ICON_KEY" }, { status: 400 });
    }
    iconKey = k;
  }

  const isHighlighted = body.isHighlighted === true;

  let triggerType: string | null = null;
  let triggerThreshold: number | null = null;
  if (body.triggerType != null && body.triggerType !== "") {
    const tt = String(body.triggerType).trim();
    if (!isBadgeTriggerType(tt)) {
      return NextResponse.json({ error: "INVALID_TRIGGER_TYPE" }, { status: 400 });
    }
    triggerType = tt;
    if (tt === "MANUAL") {
      triggerThreshold = null;
    } else if (badgeTriggerShowsThreshold(tt)) {
      const th = body.triggerThreshold;
      if (typeof th !== "number" || !Number.isFinite(th) || th < 0 || th > 1_000_000_000) {
        return NextResponse.json({ error: "INVALID_TRIGGER_THRESHOLD" }, { status: 400 });
      }
      triggerThreshold = Math.floor(th);
    }
  }

  try {
    const created = await prisma.badge.create({
      data: {
        name,
        description,
        iconUrl,
        iconKey,
        isHighlighted,
        triggerType,
        triggerThreshold,
      },
      select: badgeSelect,
    });
    return NextResponse.json({ ok: true, badge: created });
  } catch {
    return NextResponse.json({ error: "DUPLICATE_NAME" }, { status: 409 });
  }
}
