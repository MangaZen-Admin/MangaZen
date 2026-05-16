import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { headers } from "next/headers";
import { r2Client } from "@/lib/r2";
import { requireScanAccess } from "@/lib/scan-access";

export const runtime = "nodejs";

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "mangazen";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

export async function POST(request: Request): Promise<NextResponse> {
  const gate = await requireScanAccess(await headers());
  if (!gate.ok) return gate.response;

  let body: { key?: string; contentType?: string };
  try {
    body = await request.json() as { key?: string; contentType?: string };
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const key = typeof body.key === "string" ? body.key : null;
  const contentType = typeof body.contentType === "string" ? body.contentType : "image/jpeg";

  if (!key || !key.startsWith("chapters/")) {
    return NextResponse.json({ error: "INVALID_KEY" }, { status: 400 });
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 });
  const publicUrl = `${R2_PUBLIC_URL}/${key}`;

  return NextResponse.json({ presignedUrl, publicUrl });
}