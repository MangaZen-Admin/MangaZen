import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readOptionalSessionUserId } from "@/lib/auth-session";
import { cleanExpired, getMangaReaderCount, getOnlineCount, registerPresence } from "@/lib/presence";

const ANON_COOKIE = "mangazen_presence_anon";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

const presenceThrottle = new Map<string, number>();
const PRESENCE_THROTTLE_MS = 30_000;

function buildVisitorKey(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): { key: string; anonId?: string; isNewAnon: boolean } {
  const uid = readOptionalSessionUserId(cookieStore);
  if (uid) return { key: `u:${uid}`, isNewAnon: false };
  const existing = cookieStore.get(ANON_COOKIE)?.value;
  if (existing && existing.length >= 16) {
    return { key: `a:${existing}`, isNewAnon: false };
  }
  const anonId = randomBytes(16).toString("hex");
  return { key: `a:${anonId}`, anonId, isNewAnon: true };
}

function applyAnonCookie(res: NextResponse, anonId: string | undefined, isNewAnon: boolean) {
  if (!isNewAnon || !anonId) return;
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(ANON_COOKIE, anonId, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function GET() {
  cleanExpired();
  return NextResponse.json({ onlineCount: getOnlineCount() });
}

export async function POST(request: Request) {
  cleanExpired();

  const cookieStore = await cookies();
  const { key, anonId, isNewAnon } = buildVisitorKey(cookieStore);

  let mangaSlug: string | undefined;
  try {
    const body = (await request.json()) as { mangaSlug?: unknown };
    if (typeof body.mangaSlug === "string") {
      const t = body.mangaSlug.trim();
      mangaSlug = t.length > 0 ? t : undefined;
    }
  } catch {
    /* body vacío o no JSON */
  }

  const lastPing = presenceThrottle.get(key) ?? 0;
  if (Date.now() - lastPing < PRESENCE_THROTTLE_MS) {
    const onlineCount = getOnlineCount();
    const payload: { onlineCount: number; mangaReaderCount?: number } = { onlineCount };
    if (mangaSlug) {
      payload.mangaReaderCount = getMangaReaderCount(mangaSlug);
    }
    const res = NextResponse.json(payload);
    applyAnonCookie(res, anonId, isNewAnon);
    return res;
  }
  presenceThrottle.set(key, Date.now());

  registerPresence(key, mangaSlug);

  const onlineCount = getOnlineCount();
  const payload: { onlineCount: number; mangaReaderCount?: number } = { onlineCount };
  if (mangaSlug) {
    payload.mangaReaderCount = getMangaReaderCount(mangaSlug);
  }

  const res = NextResponse.json(payload);
  applyAnonCookie(res, anonId, isNewAnon);
  return res;
}
