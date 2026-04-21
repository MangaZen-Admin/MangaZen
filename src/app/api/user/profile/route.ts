import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { patchProfileSchema } from "@/lib/validation/username-profile";

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = patchProfileSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "INVALID_BODY";
    if (msg === "USERNAME_INVALID") return NextResponse.json({ error: "USERNAME_INVALID" }, { status: 400 });
    if (msg === "DONATION_URL_INVALID")
      return NextResponse.json({ error: "DONATION_URL_INVALID" }, { status: 400 });
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const normalized = parsed.data.username;
  const externalDonationLink =
    parsed.data.externalDonationLink === undefined ? undefined : parsed.data.externalDonationLink;

  if (normalized != null) {
    const taken = await prisma.user.findFirst({
      where: {
        username: normalized,
        id: { not: auth.userId! },
      },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ error: "USERNAME_TAKEN" }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: auth.userId! },
    data: {
      ...(normalized != null ? { username: normalized } : {}),
      ...(externalDonationLink !== undefined ? { externalDonationLink } : {}),
    },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      image: true,
      role: true,
      zenPoints: true,
      externalDonationLink: true,
    },
  });

  return NextResponse.json({ user: updated });
}
