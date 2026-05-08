import { NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mangazen-ar.vercel.app";

export async function GET(): Promise<NextResponse> {
  const body = `User-agent: *
Allow: /

# Paneles privados
Disallow: /admin
Disallow: /scan
Disallow: /profile
Disallow: /billing

# APIs
Disallow: /api/

# Parámetros de búsqueda internos
Disallow: /*?*tab=*
Disallow: /*?*token=*

Sitemap: ${APP_URL}/sitemap.xml
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
