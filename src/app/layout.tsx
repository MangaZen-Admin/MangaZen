import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import Navbar from "@/components/Navbar"; // Import arriba con los demás
import { getAuthenticatedUserIdServer } from "@/lib/auth-session";
import { ScanTermsModal } from "@/components/scan-terms/ScanTermsModal";
import { ThemeProvider } from "@/components/ThemeProvider";
import RouteModeSync from "@/components/RouteModeSync";
import { CreatorRoleNotificationListener } from "@/components/CreatorRoleNotificationListener";
import { Toaster } from "@/components/ui/sonner";
import { GlobalAdblockBannerShell } from "@/components/GlobalAdblockBannerShell";
import { GlobalBanner } from "@/components/GlobalBanner";
import { SiteFooter } from "@/components/SiteFooter";
import { AutoTranslationNotice } from "@/components/ui/auto-translation-notice";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MangaZen - Tu plataforma de Manga",
  description: "Lee y comparte tus mangas favoritos",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const userId = await getAuthenticatedUserIdServer();
  let scanTermsUser: { role: "SCAN" | "CREATOR" } | null = null;

  if (userId) {
    const { prisma } = await import("@/lib/db");
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, acceptedScanTermsAt: true },
    });
    if (
      dbUser &&
      dbUser.role !== "ADMIN" &&
      (dbUser.role === "SCAN" || dbUser.role === "CREATOR") &&
      !dbUser.acceptedScanTermsAt
    ) {
      scanTermsUser = { role: dbUser.role };
    }
  }

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        suppressHydrationWarning
        className="flex min-h-full flex-col bg-background text-foreground"
      >
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
        (function() {
          try {
            var theme = localStorage.getItem('theme');
            if (theme === 'light') {
              document.documentElement.classList.remove('dark');
            } else {
              document.documentElement.classList.add('dark');
            }
          } catch(e) {}
        })();
      `,
          }}
        />
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            <Toaster />
            {scanTermsUser && <ScanTermsModal role={scanTermsUser.role} />}
            <CreatorRoleNotificationListener />
            <RouteModeSync />
            <Navbar />
            {/* El padding-top (pt-20) evita que la Navbar tape el inicio de la página */}
            <main id="app-main" className="min-h-0 flex-1 pt-16 sm:pt-20">
              <GlobalBanner />
              <GlobalAdblockBannerShell />
              <AutoTranslationNotice />
              {children}
            </main>
            <SiteFooter />
          </NextIntlClientProvider>
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}