"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee, Clock, Wallet, Info } from "lucide-react";
import { format } from "date-fns";
import type { CampaignExpense } from "@/types/general";
import React from "react";

interface CategoryDetailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    category: string;
    expenses: CampaignExpense[];
    allocated: number;
    icon: React.ReactNode;
}

export function CategoryDetailDialog({ 
    isOpen, 
    onClose, 
    category, 
    expenses, 
    allocated,
    icon 
}: CategoryDetailDialogProps) {
    const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const remaining = allocated - totalSpent;
    const progress = allocated > 0 ? (totalSpent / allocated) * 100 : 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#0c0c0e] border-white/5 text-foreground sm:max-w-3xl p-0 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)]">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none"></div>
                
                <DialogHeader className="p-6 pb-2 relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                            {icon}
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em]">Category Overview</p>
                            <DialogTitle className="text-2xl font-bold tracking-tight text-white">{category}</DialogTitle>
                        </div>
                    </div>
                </DialogHeader>

                <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet size={14} className="text-zinc-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Allocated</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <IndianRupee size={16} className="text-zinc-600" />
                            <span className="text-xl font-bold text-white">
                                {allocated.toLocaleString("en-IN")}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Info size={14} className="text-orange-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Consumed</span>
                        </div>
                        <div className="flex items-baseline gap-1 text-orange-500">
                            <IndianRupee size={16} />
                            <span className="text-xl font-bold">
                                {totalSpent.toLocaleString("en-IN")}
                            </span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1 mt-3 overflow-hidden">
                            <div 
                                className={`h-1 rounded-full ${progress >= 100 ? 'bg-red-500' : 'bg-orange-500'}`}
                                style={{ width: `${Math.min(100, progress)}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Available</span>
                        </div>
                        <div className={`flex items-baseline gap-1 ${remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            <IndianRupee size={16} />
                            <span className="text-xl font-bold">
                                {remaining.toLocaleString("en-IN")}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-6 relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                            <span className="w-1 h-4 bg-orange-500 rounded-full"></span>
                            Transaction History
                        </h3>
                        <span className="text-[10px] font-bold text-zinc-500">{expenses.length} Entries</span>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden max-h-[400px] overflow-y-auto no-scrollbar">
                        <Table>
                            <TableHeader className="bg-white/5 sticky top-0 z-20">
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3">Date</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3">Description</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3">Method</TableHead>
                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider py-3 text-right pr-6">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-sm">
                                            No entries found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    expenses.map((expense) => (
                                        <TableRow key={expense.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                            <TableCell className="py-4 text-xs font-medium text-zinc-400">
                                                {format(new Date(expense.date), "MMM dd")}
                                            </TableCell>
                                            <TableCell className="py-4 text-sm font-semibold text-white">
                                                {expense.description}
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                                                    expense.payment_method === 'Cash' 
                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>
                                                    {expense.payment_method === 'Cash' ? '💵' : '💳'} {expense.payment_method || 'Online'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="py-4 text-right pr-6">
                                                <div className="flex items-center justify-end gap-1 font-bold text-white">
                                                    <IndianRupee size={12} className="text-zinc-600" />
                                                    {Number(expense.amount).toLocaleString("en-IN")}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
