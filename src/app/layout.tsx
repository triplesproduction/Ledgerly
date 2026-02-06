import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

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
  // We import Sidebar dynamically or conditionally if needed, but for now typical static import
  // But wait, this is RootLayout. 
  // Let's modify the body to have a flex container? 
  // Or just put Sidebar fixed and add pl-64 to children container.

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${montserrat.variable} font-sans antialiased bg-background min-h-screen`}
      >
        {/* Sidebar is fixed, so we just render it */}
        {/* Note: In a real app we might put this in a separate layout file for authenticated routes */}
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-64 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
