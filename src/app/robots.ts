import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mangazen-ar.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/scan", "/profile", "/billing", "/api/"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
