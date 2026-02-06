"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Loader2, Calendar as CalendarIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Employee {
    id: string;
    name: string;
    salary: number;
}

interface PaymentHistoryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
}

export function PaymentHistoryModal({ open, onOpenChange, employee }: PaymentHistoryModalProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (open && employee) {
            fetchHistory();
        }
    }, [open, employee]);

    const fetchHistory = async () => {
        setIsLoading(true);
        // Fetch expenses linked to this employee (by vendor name for now, or metadata if we added it)
        // We use vendor name as linking key based on PaymentModal implementation
        if (!employee) return;

        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('vendor', employee.name)
            .eq('category', 'Payroll') // Assuming category is Payroll
            .order('date', { ascending: false });

        if (data) {
            // Group by Month
            const grouped = data.reduce((acc: any, item: any) => {
                const monthKey = format(parseISO(item.date), 'yyyy-MM'); // Sortable key
                if (!acc[monthKey]) {
                    acc[monthKey] = {
                        month: format(parseISO(item.date), 'MMMM yyyy'),
                        total: 0,
                        items: []
                    };
                }
                acc[monthKey].items.push(item);
                acc[monthKey].total += Number(item.amount);
                return acc;
            }, {});

            // Convert to array and sort
            const sorted = Object.entries(grouped)
                .sort(([a], [b]) => b.localeCompare(a)) // Descending by date key
                .map(([_, val]: any) => val);

            setHistory(sorted);
        }
        setIsLoading(false);
    };

    if (!employee) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#0e0e11] border-white/10 text-foreground sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
                <DialogHeader className="border-b border-white/5 pb-4">
                    <DialogTitle className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold border border-orange-500/20">
                            {employee.name.charAt(0)}
                        </div>
                        <div>
                            <div className="text-lg">Payment History</div>
                            <div className="text-xs text-muted-foreground font-normal">Payroll records for {employee.name}</div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="py-2 space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                            <Loader2 className="animate-spin mr-2 h-4 w-4" /> Loading records...
                        </div>
                    ) : history.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground text-sm">
                            No payroll history found for this employee.
                        </div>
                    ) : (
                        history.map((group: any, idx) => (
                            <div key={idx} className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                                {/* Month Header */}
                                <div className="p-4 flex items-center justify-between bg-white/[0.02]">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon size={14} className="text-zinc-500" />
                                        <span className="font-semibold text-zinc-200">{group.month}</span>
                                    </div>
                                    <div className="font-mono font-bold text-emerald-400">
                                        ₹{group.total.toLocaleString('en-IN')}
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="divide-y divide-white/5">
                                    {group.items.map((item: any) => (
                                        <div key={item.id} className="p-3 pl-8 flex items-center justify-between hover:bg-white/5 transition-colors">
                                            <div>
                                                <div className="text-sm text-zinc-300">{item.description}</div>
                                                <div className="text-[10px] text-zinc-500 mt-0.5">
                                                    {format(parseISO(item.date), 'MMM d')} • {item.payment_method}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-medium text-zinc-300">₹{Number(item.amount).toLocaleString('en-IN')}</span>
                                                <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-500 py-0 h-5">PAID</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
