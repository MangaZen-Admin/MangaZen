import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://mangazen.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/*/admin",
          "/*/profile",
          "/*/scan-panel",
          "/*/billing",
          "/*/banned",
          "/*/suspended",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
