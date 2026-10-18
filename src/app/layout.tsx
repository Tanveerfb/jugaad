import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { DesktopTitleBar } from "@/components/desktop-title-bar";
import { Ribs } from "@/components/motif/ribs";
import { TopBar } from "@/components/top-bar";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Jugaad",
  description: "A local AI workbench — private by default.",
};

/*
 * Applies a saved theme before first paint, so a light-mode user never sees a dark flash.
 * Server render is always dark (the default); see Next's "preventing flash before hydration".
 * Also marks the desktop app's window (its user agent ends "JugaadDesktop", desktop/main.mjs),
 * so the title strip is there from the first paint.
 */
const themeScript = `(function(){var d=document.documentElement;if(/JugaadDesktop/.test(navigator.userAgent))d.setAttribute("data-desktop","");try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")d.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="relative min-h-full overflow-x-hidden">
        <TooltipProvider>
          <DesktopTitleBar />
          <Ribs />
          <div className="relative z-10 flex min-h-full flex-col">
            <TopBar />
            {children}
          </div>
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
