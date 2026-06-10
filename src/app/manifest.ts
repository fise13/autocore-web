import type { MetadataRoute } from "next";

import { MARKETING_BRAND } from "@/lib/seo/marketing-seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AutoCore — программа для авторазборок и автосервисов",
    short_name: MARKETING_BRAND.name,
    description: MARKETING_BRAND.shortDescription,
    start_url: "/",
    display: "standalone",
    background_color: MARKETING_BRAND.themeColor,
    theme_color: MARKETING_BRAND.themeColor,
    lang: MARKETING_BRAND.language,
    dir: "ltr",
    categories: ["business", "productivity", "finance"],
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
