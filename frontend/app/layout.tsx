import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider, themeScript } from "@/lib/theme";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trellis — the map of what you're learning",
  description:
    "Trellis shows the map of a subject, what you can skip, what to study next, and the earlier topic that is really why you're stuck. It never teaches; it writes the prompt for your own AI.",
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
