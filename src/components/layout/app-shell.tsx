"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    // Check if the current route is the login page
    const isLoginPage = pathname === "/login" || pathname === "/login/";

    if (isLoginPage) {
        return (
            <main className="min-h-screen bg-black">
                {children}
            </main>
        );
    }

    return (
        <TooltipProvider>
            <div className="flex bg-background min-h-screen">
                <Sidebar />
                <main className="flex-1 ml-64 p-8">
                    {children}
                </main>
            </div>
        </TooltipProvider>
    );
}
