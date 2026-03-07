"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Wallet,
    CreditCard,
    Settings,
    LogOut,
    FileText,
    Users,
    Briefcase,
    RefreshCcw,
    UserCircle,
    Clock,
    TrendingUp,
    X,
    Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar({ isOpen = false, onClose }: { isOpen?: boolean; onClose?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();

    const isActive = (path: string) => pathname === path;

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            <div className={`w-64 border-r border-white/5 bg-[#000000] flex flex-col h-screen fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
                {/* Header: Logo */}
                <div className="p-6 pb-2 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 relative flex-shrink-0">
                            {/* Glass Logo SVG v3: Enhanced Frost & Depth */}
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" className="w-full h-full drop-shadow-2xl">
                                <defs>
                                    <linearGradient id="sbBg" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stopColor="#18181b" />
                                        <stop offset="1" stopColor="#000000" />
                                    </linearGradient>
                                    <linearGradient id="sbOrange" x1="150" y1="150" x2="350" y2="350" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stopColor="#fb923c" />
                                        <stop offset="1" stopColor="#ea580c" />
                                    </linearGradient>
                                    <linearGradient id="sbShine" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stopColor="white" stopOpacity="0.15" />
                                        <stop offset="0.4" stopColor="white" stopOpacity="0.05" />
                                        <stop offset="1" stopColor="white" stopOpacity="0" />
                                    </linearGradient>
                                    <linearGradient id="sbStroke" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
                                        <stop offset="0" stopColor="white" stopOpacity="0.3" />
                                        <stop offset="1" stopColor="white" stopOpacity="0.05" />
                                    </linearGradient>
                                </defs>
                                <rect width="512" height="512" rx="128" fill="url(#sbBg)" />
                                {/* Inner Soul (Orange L) */}
                                <path d="M170 160V340C170 351.046 178.954 360 190 360H340" stroke="url(#sbOrange)" strokeWidth="64" strokeLinecap="round" strokeLinejoin="round" />
                                {/* Glass Overlay */}
                                <path d="M0 128C0 57.2975 57.2975 0 128 0H512L0 512V128Z" fill="url(#sbShine)" />
                                {/* Floating White Pills */}
                                <rect x="280" y="160" width="80" height="20" rx="10" fill="white" fillOpacity="0.8" />
                                <rect x="280" y="200" width="50" height="20" rx="10" fill="white" fillOpacity="0.5" />
                                {/* Edge Stroke */}
                                <rect width="512" height="512" rx="128" stroke="url(#sbStroke)" strokeWidth="10" />
                            </svg>
                        </div>
                        <div>
                            <div className="font-bold text-lg tracking-tight text-white leading-none">Ledgerly</div>
                            <div className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-wider">Triple S Production</div>
                        </div>
                    </div>
                    {/* Mobile Close Button */}
                    <Button variant="ghost" size="icon" className="lg:hidden text-zinc-400 hover:text-white hover:bg-white/10 -mr-2" onClick={onClose}>
                        <X size={20} />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-2 custom-scrollbar sidebar-scroll-area">
                    <nav className="space-y-1 pb-4">
                        <NavItem href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" active={isActive("/")} onClick={onClose} />
                        <NavItem href="/clients" icon={<Users size={20} />} label="Clients" active={isActive("/clients")} onClick={onClose} />
                        <NavItem href="/services" icon={<Briefcase size={20} />} label="Services" active={isActive("/services")} onClick={onClose} />
                        <NavItem href="/income" icon={<Wallet size={20} />} label="Income" active={isActive("/income")} onClick={onClose} />
                        <NavItem href="/expenses" icon={<CreditCard size={20} />} label="Expenses" active={isActive("/expenses")} onClick={onClose} />
                        <NavItem href="/office-expenses" icon={<Building2 size={20} />} label="Office Expenses" active={isActive("/office-expenses")} onClick={onClose} />
                        <NavItem href="/campaigns" icon={<TrendingUp size={20} />} label="Campaign Expenses" active={isActive("/campaigns") || pathname?.startsWith("/campaigns")} onClick={onClose} />
                        <NavItem href="/recurring" icon={<RefreshCcw size={20} />} label="Recurring Income" active={isActive("/recurring")} onClick={onClose} />
                        <NavItem href="/recurring_costs" icon={<RefreshCcw size={20} />} label="Recurring Expenses" active={isActive("/recurring_costs")} onClick={onClose} />
                        <NavItem href="/receivables" icon={<Clock size={20} />} label="Receivables" active={isActive("/receivables")} onClick={onClose} />
                        <NavItem href="/employees" icon={<UserCircle size={20} />} label="Employees" active={isActive("/employees")} onClick={onClose} />
                        <NavItem href="/reports" icon={<FileText size={20} />} label="Reports" active={isActive("/reports")} onClick={onClose} />
                        <NavItem href="/settings" icon={<Settings size={20} />} label="Settings" active={isActive("/settings")} onClick={onClose} />
                    </nav>
                </div>

                {/* Footer: Logout */}
                <div className="p-6 border-t border-white/5 bg-[#000000] shrink-0 z-10">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 px-4 h-11 rounded-xl"
                        onClick={handleLogout}
                    >
                        <LogOut size={20} className="mr-2" />
                        Logout
                    </Button>
                </div>
            </div>
        </>
    );
}

function NavItem({ href, icon, label, active = false, onClick }: { href: string; icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
    return (
        <Link href={href} className="block" onClick={onClick}>
            <Button
                variant="ghost"
                className={`w-full justify-start pl-4 pr-8 h-12 rounded-xl mb-1 transition-all duration-300 relative group overflow-hidden ${active
                    ? "bg-[#09090b] text-white font-bold border border-white/10 shadow-[0_0_30px_-10px_rgba(249,115,22,0.6)]"
                    : "text-zinc-500 border border-transparent hover:bg-[#121217] hover:text-white hover:border-white/5 hover:shadow-[0_0_20px_-5px_rgba(249,115,22,0.15)]"
                    }`}
            >
                <span className={`mr-2 transition-colors ${active ? "text-white" : "text-zinc-500 group-hover:text-white"}`}>{icon}</span>
                {label}
            </Button>
        </Link>
    )
}
