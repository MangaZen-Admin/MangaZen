import { createHash, createHmac, randomBytes } from "node:crypto";
import type { Session } from "@prisma/client";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getClientIp } from "@/lib/client-ip";
import { awardDailyLoginShardsIfEligible, disableExpiredProIfNeeded } from "@/lib/zen-currency";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 15;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET ?? "mangazen-dev-access-secret";

type AccessTokenPayload = {
  userId: string;
  exp: number;
  nonce: string;
};

export type AuthenticateResult = {
  userId: string | null;
  rotated: boolean;
  revokedReason?: "ip_change";
};

function toBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function buildAccessToken(userId: string): string {
  const payload: AccessTokenPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
    nonce: randomBytes(8).toString("hex"),
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", ACCESS_SECRET).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyAccessToken(token: string | undefined): string | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", ACCESS_SECRET).update(encoded).digest("base64url");
  if (expected !== signature) return null;
  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as AccessTokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

function createRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

type AuthCookieStore = Awaited<ReturnType<typeof cookies>>;

/** Sesión opcional para APIs ligeras (sin rotación ni comprobación de IP). */
export function readOptionalSessionUserId(cookieStore: AuthCookieStore): string | null {
  const rawUserId = cookieStore.get("mangazen_user_id")?.value ?? null;
  const accessToken = cookieStore.get("mangazen_access_token")?.value;
  const fromAccess = verifyAccessToken(accessToken);
  if (fromAccess && rawUserId === fromAccess) return rawUserId;
  return null;
}

function setAuthCookies(cookieStore: AuthCookieStore, data: { userId: string; accessToken: string; refreshToken: string }) {
  const secure = process.env.NODE_ENV === "production";
  cookieStore.set("mangazen_user_id", data.userId, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
  cookieStore.set("mangazen_access_token", data.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
  cookieStore.set("mangazen_refresh_token", data.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
}

export function clearAuthCookies(cookieStore: AuthCookieStore) {
  cookieStore.delete("mangazen_user_id");
  cookieStore.delete("mangazen_access_token");
  cookieStore.delete("mangazen_refresh_token");
}

async function createRefreshSession(
  userId: string,
  refreshToken: string,
  lastIp: string | null | undefined
): Promise<Session> {
  return prisma.session.create({
    data: {
      userId,
      sessionToken: hashToken(refreshToken),
      expires: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      lastIp: lastIp ?? null,
    },
  });
}

type SessionRow = { id: string; lastIp: string | null };

async function findSessionByRefresh(userId: string, refreshToken: string): Promise<SessionRow | null> {
  return prisma.session.findFirst({
    where: {
      userId,
      sessionToken: hashToken(refreshToken),
      expires: { gt: new Date() },
    },
    select: { id: true, lastIp: true },
  });
}

async function invalidateSessionForIpChange(cookieStore: AuthCookieStore, sessionId: string) {
  try {
    await prisma.session.delete({ where: { id: sessionId } });
  } catch {
    /* row may already be gone */
  }
  clearAuthCookies(cookieStore);
}

async function maybeUpdateSessionLastIp(sessionId: string, ip: string | null) {
  if (!ip) return;
  try {
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastIp: ip },
    });
  } catch {
    /* ignore */
  }
}

/** Returns true if session was revoked (IP mismatch). */
async function checkSessionIpAndMaybeRevoke(
  cookieStore: AuthCookieStore,
  session: SessionRow,
  ip: string | null
): Promise<boolean> {
  if (session.lastIp && ip && session.lastIp !== ip) {
    await invalidateSessionForIpChange(cookieStore, session.id);
    return true;
  }
  return false;
}

export async function issueLoginSession(userId: string, cookieStore: AuthCookieStore, requestHeaders: Headers) {
  const refreshToken = createRefreshToken();
  const accessToken = buildAccessToken(userId);
  const ip = getClientIp(requestHeaders);
  await createRefreshSession(userId, refreshToken, ip);
  setAuthCookies(cookieStore, { userId, accessToken, refreshToken });
}

export async function revokeRefreshSession(refreshToken: string | undefined) {
  if (!refreshToken) return;
  await prisma.session.deleteMany({
    where: {
      sessionToken: hashToken(refreshToken),
    },
  });
}

export async function getAuthenticatedUserIdServer(): Promise<string | null> {
  const cookieStore = await cookies();
  const headerList = await headers();
  const ip = getClientIp(headerList);
  const rawUserId = cookieStore.get("mangazen_user_id")?.value ?? null;
  const accessToken = cookieStore.get("mangazen_access_token")?.value;
  const refreshToken = cookieStore.get("mangazen_refresh_token")?.value;

  const fromAccess = verifyAccessToken(accessToken);

  if (fromAccess && rawUserId === fromAccess) {
    if (refreshToken) {
      const existing = await findSessionByRefresh(rawUserId, refreshToken);
      if (existing) {
        if (await checkSessionIpAndMaybeRevoke(cookieStore, existing, ip)) {
          const locale = await getLocale();
          redirect(`/${locale}/login?reason=ip_change`);
        }
        await maybeUpdateSessionLastIp(existing.id, ip);
      }
    }
    await disableExpiredProIfNeeded(rawUserId);
    await awardDailyLoginShardsIfEligible(rawUserId);
    return rawUserId;
  }

  if (!refreshToken || !rawUserId) return null;

  const existing = await findSessionByRefresh(rawUserId, refreshToken);
  if (!existing) return null;

  if (await checkSessionIpAndMaybeRevoke(cookieStore, existing, ip)) {
    const locale = await getLocale();
    redirect(`/${locale}/login?reason=ip_change`);
  }

  await maybeUpdateSessionLastIp(existing.id, ip);
  await disableExpiredProIfNeeded(rawUserId);
  await awardDailyLoginShardsIfEligible(rawUserId);
  return rawUserId;
}

export async function authenticateRequestWithRotation(
  requestCookieStore: AuthCookieStore,
  requestHeaders: Headers
): Promise<AuthenticateResult> {
  const ip = getClientIp(requestHeaders);
  const rawUserId = requestCookieStore.get("mangazen_user_id")?.value ?? null;
  const accessToken = requestCookieStore.get("mangazen_access_token")?.value;
  const refreshToken = requestCookieStore.get("mangazen_refresh_token")?.value;

  const fromAccess = verifyAccessToken(accessToken);

  if (fromAccess && rawUserId === fromAccess) {
    if (refreshToken) {
      const existing = await findSessionByRefresh(rawUserId, refreshToken);
      if (existing) {
        if (await checkSessionIpAndMaybeRevoke(requestCookieStore, existing, ip)) {
          return { userId: null, rotated: false, revokedReason: "ip_change" };
        }
        await maybeUpdateSessionLastIp(existing.id, ip);
      }
    }
    await disableExpiredProIfNeeded(rawUserId);
    await awardDailyLoginShardsIfEligible(rawUserId);
    return { userId: rawUserId, rotated: false };
  }

  if (!refreshToken || !rawUserId) {
    return { userId: null, rotated: false };
  }

  const existing = await findSessionByRefresh(rawUserId, refreshToken);
  if (!existing) {
    return { userId: null, rotated: false };
  }

  if (await checkSessionIpAndMaybeRevoke(requestCookieStore, existing, ip)) {
    return { userId: null, rotated: false, revokedReason: "ip_change" };
  }

  await prisma.session.delete({ where: { id: existing.id } });
  const newRefreshToken = createRefreshToken();
  const newAccessToken = buildAccessToken(rawUserId);
  await createRefreshSession(rawUserId, newRefreshToken, ip);
  setAuthCookies(requestCookieStore, {
    userId: rawUserId,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  });

  await disableExpiredProIfNeeded(rawUserId);
  await awardDailyLoginShardsIfEligible(rawUserId);
  return { userId: rawUserId, rotated: true };
}

export function jsonIfUnauthenticated(result: AuthenticateResult): NextResponse | null {
  if (result.userId) return null;
  return NextResponse.json(
    {
      error: "UNAUTHORIZED",
      ...(result.revokedReason ? { reason: result.revokedReason } : {}),
    },
    { status: 401 }
  );
}
