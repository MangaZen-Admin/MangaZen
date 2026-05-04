import { NextResponse } from "next/server";
import { requireAdminJson } from "@/lib/admin-api-auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireAdminJson(request);
  if (!gate.ok) return gate.response;

  const requests = await prisma.changeRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      status: true,
      entityId: true,
      previousData: true,
      newData: true,
      createdAt: true,
      requester: {
        select: { id: true, name: true, email: true, username: true },
      },
    },
  });

  return NextResponse.json({ requests });
}
