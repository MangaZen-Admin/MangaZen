import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const userId = auth.userId!;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const file = form.get("banner");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadImageToCloudinary(
    buffer,
    "mangazen/banners",
    `banner_${userId}`
  );

  await prisma.user.update({
    where: { id: userId },
    data: { bannerImage: url },
  });

  return NextResponse.json({ url });
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies();
  const auth = await authenticateRequestWithRotation(cookieStore, request.headers);
  const unauth = jsonIfUnauthenticated(auth);
  if (unauth) return unauth;
  const userId = auth.userId!;

  await prisma.user.update({
    where: { id: userId },
    data: { bannerImage: null },
  });

  return NextResponse.json({ ok: true });
}
