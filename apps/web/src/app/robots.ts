import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard/",
        "/admin/",
        "/api/",
        "/hero-lab",
        "/login",
        "/register",
        "/verify-email",
      ],
    },
    sitemap: "https://oyinca.com/sitemap.xml",
  };
}
