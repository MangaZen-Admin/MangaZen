import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies();
  const headerList = await headers();
  const auth = await authenticateRequestWithRotation(cookieStore, headerList);

  if (!auth.userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { zenCoins: true, zenShards: true },
  });

  if (!user) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ zenCoins: user.zenCoins, zenShards: user.zenShards });
}
