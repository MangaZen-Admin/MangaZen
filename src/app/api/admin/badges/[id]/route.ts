import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { BADGE_ICON_KEYS } from "@/lib/badges/badge-icons";
import { badgeTriggerShowsThreshold, isBadgeTriggerType } from "@/lib/badges/badge-trigger-types";

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

type RouteParams = { params: Promise<{ id: string }> };

async function requireAdminBadgeAccess(request: Request, id: string) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
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

  const existing = await prisma.badge.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false as const, response: NextResponse.json({ error: "NOT_FOUND" }, { status: 404 }) };
  }

  return { ok: true as const };
}

export async function PATCH(request: Request, context: RouteParams) {
  const { id } = await context.params;
  const gate = await requireAdminBadgeAccess(request, id);
  if (!gate.ok) return gate.response;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const data: {
    name?: string;
    description?: string;
    iconUrl?: string | null;
    iconKey?: string | null;
    isHighlighted?: boolean;
    triggerType?: string | null;
    triggerThreshold?: number | null;
  } = {};

  if (typeof body.name === "string") {
    const n = body.name.trim();
    if (n.length >= 2) data.name = n;
  }
  if (typeof body.description === "string") {
    const d = body.description.trim();
    if (d.length >= 4) data.description = d;
  }
  if (body.iconUrl === null || (typeof body.iconUrl === "string" && body.iconUrl.trim() === "")) {
    data.iconUrl = null;
  } else if (typeof body.iconUrl === "string") {
    data.iconUrl = body.iconUrl.trim();
  }
  if (body.iconKey === null || (typeof body.iconKey === "string" && body.iconKey.trim() === "")) {
    data.iconKey = null;
  } else if (typeof body.iconKey === "string") {
    const k = body.iconKey.trim();
    if (!BADGE_ICON_KEYS.includes(k)) {
      return NextResponse.json({ error: "INVALID_ICON_KEY" }, { status: 400 });
    }
    data.iconKey = k;
  }
  if (typeof body.isHighlighted === "boolean") {
    data.isHighlighted = body.isHighlighted;
  }

  if ("triggerType" in body) {
    const raw = body.triggerType;
    if (raw === null || raw === "") {
      data.triggerType = null;
      data.triggerThreshold = null;
    } else if (typeof raw === "string" && isBadgeTriggerType(raw.trim())) {
      const tt = raw.trim();
      data.triggerType = tt;
      if (tt === "MANUAL" || !badgeTriggerShowsThreshold(tt)) {
        data.triggerThreshold = null;
      } else {
        const th = body.triggerThreshold;
        if (typeof th !== "number" || !Number.isFinite(th) || th < 0 || th > 1_000_000_000) {
          return NextResponse.json({ error: "INVALID_TRIGGER_THRESHOLD" }, { status: 400 });
        }
        data.triggerThreshold = Math.floor(th);
      }
    } else {
      return NextResponse.json({ error: "INVALID_TRIGGER_TYPE" }, { status: 400 });
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  try {
    const updated = await prisma.badge.update({
      where: { id },
      data,
      select: badgeSelect,
    });
    return NextResponse.json({ ok: true, badge: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "DUPLICATE_NAME" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  const { id } = await context.params;
  const gate = await requireAdminBadgeAccess(request, id);
  if (!gate.ok) return gate.response;

  await prisma.badge.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
