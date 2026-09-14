import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { getPublicLocale } from "@/server/locale";
import { getDictionary } from "@/i18n";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

/**
 * Resolved via the same cookie-based getPublicLocale() the login/invite
 * pages use (cheap, no DB call, no session required) rather than
 * getOwnerLocale() - the root layout wraps /admin too, which never sets the
 * locale cookie, so it always falls back to its existing German default.
 */
export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getPublicLocale());
  return { title: dict.common.metaTitle, description: dict.common.metaDescription };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getPublicLocale();
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${fraunces.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
