import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { v2 as cloudinary } from "cloudinary";
import { requireScanAccess } from "@/lib/scan-access";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const gate = await requireScanAccess(await headers());
  if (!gate.ok) return gate.response;

  let body: { folder?: string; public_id?: string };
  try {
    body = await request.json() as { folder?: string; public_id?: string };
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const folder = typeof body.folder === "string" ? body.folder : "mangazen/chapters";
  const public_id = typeof body.public_id === "string" ? body.public_id : undefined;

  const timestamp = Math.round(Date.now() / 1000);

  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder,
    ...(public_id ? { public_id } : {}),
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET ?? ""
  );

  return NextResponse.json({
    signature,
    timestamp,
    folder,
    public_id,
    api_key: process.env.CLOUDINARY_API_KEY,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  });
}
