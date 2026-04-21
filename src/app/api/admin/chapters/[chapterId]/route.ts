import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import {
  EARLY_ACCESS_PRICE_MAX,
  EARLY_ACCESS_PRICE_MIN,
} from "@/lib/constants/early-access";

const patchSchema = z.object({
  isEarlyAccess: z.boolean(),
  /** ISO 8601 o valor de input datetime-local normalizado en el cliente. */
  earlyAccessUntil: z.union([z.string().min(1), z.null()]).optional(),
  earlyAccessPrice: z.union([z.number().int(), z.null()]).optional(),
});

export async function PATCH(request: Request, ctx: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = await ctx.params;
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const sessionUserId = auth.userId!;

  const admin = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { role: true },
  });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const { isEarlyAccess, earlyAccessUntil: untilRaw, earlyAccessPrice: priceRaw } = parsed.data;

  let earlyAccessUntil: Date | null = null;
  let earlyAccessPrice: number | null = null;

  if (isEarlyAccess) {
    const untilStr = untilRaw ?? null;
    if (!untilStr) {
      return NextResponse.json({ error: "EARLY_ACCESS_UNTIL_REQUIRED" }, { status: 400 });
    }
    earlyAccessUntil = new Date(untilStr);
    if (Number.isNaN(earlyAccessUntil.getTime())) {
      return NextResponse.json({ error: "INVALID_DATE" }, { status: 400 });
    }

    if (priceRaw === undefined || priceRaw === null) {
      earlyAccessPrice = 50;
    } else {
      if (priceRaw < EARLY_ACCESS_PRICE_MIN || priceRaw > EARLY_ACCESS_PRICE_MAX) {
        return NextResponse.json({ error: "INVALID_PRICE" }, { status: 400 });
      }
      earlyAccessPrice = priceRaw;
    }
  }

  const updated = await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      isEarlyAccess,
      earlyAccessUntil: isEarlyAccess ? earlyAccessUntil : null,
      earlyAccessPrice: isEarlyAccess ? earlyAccessPrice : null,
    },
    select: {
      id: true,
      isEarlyAccess: true,
      earlyAccessUntil: true,
      earlyAccessPrice: true,
    },
  });

  return NextResponse.json({ ok: true, chapter: updated });
}
