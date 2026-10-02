import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

/* Inter for everything — display, body, and mono all resolve to Inter. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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
      className={`${inter.variable}`}
    >
      <body className="font-sans">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
