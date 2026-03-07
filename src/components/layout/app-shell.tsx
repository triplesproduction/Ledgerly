"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Check if the current route is the login page
    const isLoginPage = pathname === "/login" || pathname === "/login/";

    useInactivityLogout();

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
                <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
                <main className="flex-1 lg:ml-64 w-full min-w-0">
                    {/* Mobile Header */}
                    <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/5 bg-black sticky top-0 z-40">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 relative flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" className="w-full h-full drop-shadow-2xl">
                                    <defs>
                                        <linearGradient id="sbBgApp" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                                            <stop offset="0" stopColor="#18181b" />
                                            <stop offset="1" stopColor="#000000" />
                                        </linearGradient>
                                        <linearGradient id="sbOrangeApp" x1="150" y1="150" x2="350" y2="350" gradientUnits="userSpaceOnUse">
                                            <stop offset="0" stopColor="#fb923c" />
                                            <stop offset="1" stopColor="#ea580c" />
                                        </linearGradient>
                                        <linearGradient id="sbShineApp" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                                            <stop offset="0" stopColor="white" stopOpacity="0.15" />
                                            <stop offset="0.4" stopColor="white" stopOpacity="0.05" />
                                            <stop offset="1" stopColor="white" stopOpacity="0" />
                                        </linearGradient>
                                        <linearGradient id="sbStrokeApp" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                                            <stop offset="0" stopColor="white" stopOpacity="0.3" />
                                            <stop offset="1" stopColor="white" stopOpacity="0.05" />
                                        </linearGradient>
                                    </defs>
                                    <rect width="512" height="512" rx="128" fill="url(#sbBgApp)" />
                                    <path d="M170 160V340C170 351.046 178.954 360 190 360H340" stroke="url(#sbOrangeApp)" strokeWidth="64" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M0 128C0 57.2975 57.2975 0 128 0H512L0 512V128Z" fill="url(#sbShineApp)" />
                                    <rect x="280" y="160" width="80" height="20" rx="10" fill="white" fillOpacity="0.8" />
                                    <rect x="280" y="200" width="50" height="20" rx="10" fill="white" fillOpacity="0.5" />
                                    <rect width="512" height="512" rx="128" stroke="url(#sbStrokeApp)" strokeWidth="10" />
                                </svg>
                            </div>
                            <div>
                                <div className="font-bold text-base tracking-tight text-white leading-none">Ledgerly</div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)} className="text-white hover:bg-white/10">
                            <Menu size={24} />
                        </Button>
                    </div>
                    {/* Page Content */}
                    <div className="p-4 md:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </TooltipProvider>
    );
}
