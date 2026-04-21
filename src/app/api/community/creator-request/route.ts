import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateRequestWithRotation } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  projectName: z.string().trim().min(2, "min").max(200),
  description: z.string().trim().min(10, "min").max(4000),
  sampleLink: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((s) => (s === "" ? undefined : s)),
});

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const { userId } = await authenticateRequestWithRotation(cookieStore, request.headers);
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (user.role !== "USER") {
    return NextResponse.json({ error: "FORBIDDEN_ROLE" }, { status: 403 });
  }

  const pending = await prisma.creatorRoleRequest.findFirst({
    where: { userId, status: "PENDING" },
    select: { id: true },
  });
  if (pending) {
    return NextResponse.json({ error: "ALREADY_PENDING" }, { status: 409 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { projectName, description, sampleLink } = parsed.data;

  const created = await prisma.creatorRoleRequest.create({
    data: {
      userId,
      projectName,
      description,
      sampleLink,
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, request: created });
}
