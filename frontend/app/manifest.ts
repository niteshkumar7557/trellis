// The web manifest: what a phone shows when Trellis is added to the home screen (its name,
// icon and the colour of the bar around it). Next serves this as /manifest.webmanifest and
// links it from every page.

import type { MetadataRoute } from "next";
import { BRAND } from "@/components/brand/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trellis",
    short_name: "Trellis",
    description: BRAND.description,
    // The map is the product. Signed out, /map shows the sample student, so this always opens.
    start_url: "/map",
    display: "standalone",
    // The app frame's colour (--ground, light theme), so the splash screen matches the first paint.
    background_color: "#f2f4f0",
    theme_color: "#f2f4f0",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/pwa-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
