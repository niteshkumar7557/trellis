import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { BRAND, SITE_URL } from "@/components/brand/brand";
import { ThemeProvider, themeScript } from "@/lib/theme";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Titles: the front page uses `default`; a page that sets its own title gets "… · Trellis".
// metadataBase makes the share image's address absolute, which link previews require.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Trellis: the map of what you're learning", template: "%s · Trellis" },
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: "Trellis: the map of what you're learning",
    description: BRAND.description,
    url: "/",
  },
  // The large card; X falls back to the Open Graph picture (app/opengraph-image.tsx).
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plex.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <StoreProvider>{children}</StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
