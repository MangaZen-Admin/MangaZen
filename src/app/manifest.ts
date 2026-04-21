import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MangaZen",
    short_name: "MangaZen",
    description: "Lee manga, manhwa y manhua en español y más idiomas.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#9d4edd",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
