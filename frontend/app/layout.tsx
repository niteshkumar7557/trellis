import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kero",
  description: "Ask anything, and Kero will help you think it through.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1a19" },
  ],
};

// Runs before first paint so a dark-mode visitor never sees a light flash.
const themeScript = `(function(){try{if(localStorage.getItem("kero-theme")==="dark"){document.documentElement.classList.add("dark-mode");document.documentElement.dataset.theme="dark";}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${manrope.variable}`}
      suppressHydrationWarning
    >
      <body className="m-0 min-w-[320px] min-h-svh font-dm-sans text-[#252321] bg-[#f7f6f3] dark:bg-[#1b1a19] dark:text-[#e8e3de]">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
