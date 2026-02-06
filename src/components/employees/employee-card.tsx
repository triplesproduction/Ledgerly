"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format, differenceInMonths } from "date-fns";
import {
    Calendar,
    Briefcase,
    History,
    FileText,
    Pencil,
    Trash2,
    Wallet,
    Award,
    ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Employee {
    id: string;
    name: string;
    role: string;
    type: string;
    email: string;
    joinDate: string;
    salary: number;
    totalPaid: number;
    advanceTaken: number;
    status: string;
}

interface EmployeeCardProps {
    employee: Employee;
    onEdit: () => void;
    onDelete: () => void;
    onPay: () => void;
    onHistory: () => void;
    onDocs: () => void;
}

export function EmployeeCard({
    employee,
    onEdit,
    onDelete,
    onPay,
    onHistory,
    onDocs
}: EmployeeCardProps) {
    const tenureMonths = differenceInMonths(new Date(), new Date(employee.joinDate));
    const years = Math.floor(tenureMonths / 12);
    const months = tenureMonths % 12;
    const tenureString = years > 0 ? `${years}y ${months}m` : `${months}m`;

    const initials = employee.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();

    const monthlySalary = employee.salary / 12;

    return (
        <Card className="group relative overflow-hidden bg-[#0e0e11]/40 border-white/5 backdrop-blur-xl hover:border-orange-500/30 transition-all duration-500 shadow-xl">
            {/* Status Indicator Bar */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${employee.status === "Active" ? "bg-emerald-500/60" : "bg-amber-500/60"}`} />

            <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center min-h-[140px]">

                    {/* 1. Identity Section (Left) */}
                    <div className="p-6 lg:p-8 flex items-center gap-6 lg:w-[350px] shrink-0 lg:border-r border-white/5 bg-white/[0.01]">
                        <div className="relative shrink-0">
                            <Avatar className="h-20 w-20 border-2 border-white/10 shadow-2xl ring-offset-black ring-offset-2 ring-orange-500/10">
                                <AvatarFallback className="bg-gradient-to-br from-zinc-800 to-black text-white font-bold text-2xl">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className={cn(
                                "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-[#0e0e11] shadow-lg",
                                employee.status === "Active" ? "bg-emerald-500" : "bg-amber-500"
                            )} />
                        </div>
                        <div className="space-y-1 text-left min-w-0">
                            <h3 className="text-2xl font-bold text-white tracking-tight leading-none truncate">{employee.name}</h3>
                            <p className="text-sm font-bold text-orange-500 uppercase tracking-[0.2em] truncate">{employee.role}</p>
                            <div className="flex items-center gap-2 mt-3">
                                <span className="text-[10px] font-bold bg-white/5 border border-white/10 text-zinc-400 px-3 py-1 rounded-full uppercase tracking-wider">
                                    {employee.type}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 2. Financial Metrics Section (Center) - Flexible width */}
                    <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-0 min-w-0 h-full">
                        <div className="p-6 lg:p-8 flex flex-col justify-center border-b lg:border-b-0 border-r border-white/5 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-2 mb-2 opacity-50">
                                <Wallet className="w-4 h-4 text-zinc-500" />
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] whitespace-nowrap">Monthly Salary</span>
                            </div>
                            <div className="text-2xl font-bold text-white tracking-tight">
                                <span className="text-sm font-medium text-zinc-500 mr-1">₹</span>
                                {monthlySalary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                        </div>

                        <div className="p-6 lg:p-8 flex flex-col justify-center border-b lg:border-b-0 border-r border-white/5 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-2 mb-2 opacity-50">
                                <Award className="w-4 h-4 text-emerald-500/50" />
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] whitespace-nowrap">Lifetime Paid</span>
                            </div>
                            <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                                <span className="text-sm font-medium text-emerald-500/50 mr-1">₹</span>
                                {employee.totalPaid.toLocaleString('en-IN')}
                            </div>
                        </div>

                        <div className="hidden lg:flex p-6 lg:p-8 flex-col justify-center border-r border-white/5 hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center gap-2 mb-2 opacity-50">
                                <Calendar className="w-4 h-4 text-orange-500/40" />
                                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-[0.15em] whitespace-nowrap">Status & Tenure</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="text-lg font-bold text-white tracking-tight">
                                    {tenureString} <span className="text-xs font-normal text-zinc-500">Tenure</span>
                                </div>
                                <div className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded border self-start",
                                    employee.advanceTaken > 0
                                        ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                )}>
                                    {employee.advanceTaken > 0 ? `Due: ₹${employee.advanceTaken.toLocaleString()}` : "Clear Ledger"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Action Section (Right) */}
                    <div className="p-6 lg:p-8 bg-black/10 flex items-center justify-between lg:justify-end gap-6 lg:w-[450px] shrink-0">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-zinc-500 hover:text-white hover:bg-white/5"
                                onClick={onDocs}
                                title="Documents"
                            >
                                <FileText size={18} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-zinc-500 hover:text-white hover:bg-white/5"
                                onClick={onHistory}
                                title="History"
                            >
                                <History size={18} />
                            </Button>
                            <div className="w-[1px] h-6 bg-white/5 mx-1" />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-zinc-400 hover:text-white hover:bg-white/10"
                                onClick={onEdit}
                            >
                                <Pencil size={18} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={onDelete}
                            >
                                <Trash2 size={18} />
                            </Button>
                        </div>

                        <Button
                            className="h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-8 rounded-xl shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.05] active:scale-95 flex gap-3 items-center group/btn"
                            onClick={onPay}
                        >
                            PAY SALARY
                            <ChevronRight size={18} className="opacity-50 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
