import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authenticateRequestWithRotation, jsonIfUnauthenticated } from "@/lib/auth-session";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { prisma } from "@/lib/db";

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

  const file = form.get("avatar");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadImageToCloudinary(buffer, "mangazen/avatars", `avatar_${userId}`, [
    { width: 400, height: 400, crop: "fill", gravity: "face" },
  ]);

  await prisma.user.update({
    where: { id: userId },
    data: { image: url },
  });

  return NextResponse.json({ url });
}
