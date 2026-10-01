import type { Metadata } from "next";
import { Knewave, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

/* Knewave has a single weight — never pair it with font-bold/font-semibold. */
const knewave = Knewave({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ka-Lakbay — AI-Powered Student Career Navigator",
  description:
    "Ka-Lakbay helps you explore possible career paths, understand the skills you already have, discover what you can develop next, and build proof of what you can do.",
};

/**
 * Reads `kl.theme` before the first paint so a stored dark preference never
 * flashes white. Kept inline and tiny on purpose; it touches nothing but the
 * <html> class, which is why <html> carries `suppressHydrationWarning`.
 */
const THEME_INIT_SCRIPT = `(function(){try{var raw=localStorage.getItem("kl.theme");var theme=raw?JSON.parse(raw):null;if(theme==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${knewave.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable}`}
    >
      <body className="font-body">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
