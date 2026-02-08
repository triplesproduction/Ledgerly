import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "Ledgerly | Founder Finance",
  description: "Clarity over Accounting. Agency Finance System.",
  // Next.js automatically finds icon.svg in the app directory, so explicit definition is often redundant but good for safety.
  // We updated icon.svg.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${montserrat.variable} font-sans antialiased bg-background min-h-screen`}>
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
