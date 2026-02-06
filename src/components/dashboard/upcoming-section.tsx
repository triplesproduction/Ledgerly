"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

type Transaction = {
    id: string;
    name: string; // mapped from description or client/vendor
    type: string; // category
    amount: number;
    date: string;
    direction: "inbound" | "outbound";
};

export function UpcomingSection() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            // Fetch Income (Past/Received only)
            const { data: incomeData } = await supabase
                .from('income')
                .select('id, amount, description, category, date, payment_method')
                .lte('date', format(new Date(), 'yyyy-MM-dd'))
                .eq('status', 'RECEIVED')
                .order('date', { ascending: false })
                .limit(15);

            // Fetch Expenses (Past/Paid only)
            const { data: expenseData } = await supabase
                .from('expenses')
                .select('id, amount, description, category, date, payment_method')
                .lte('date', format(new Date(), 'yyyy-MM-dd'))
                .eq('status', 'PAID')
                .order('date', { ascending: false })
                .limit(15);

            // Normalize and Combine
            const formattedIncome = (incomeData || []).map(i => {
                let clientName = "Unknown Income";
                // Simple parsing if present
                if (i.description && i.description.includes(":")) {
                    clientName = i.description.split(":")[0];
                } else {
                    clientName = i.description || "Income";
                }

                return {
                    id: i.id,
                    name: clientName,
                    type: "Income",
                    amount: Number(i.amount),
                    date: i.date,
                    direction: "inbound" as const
                };
            });

            const formattedExpenses = (expenseData || []).map(e => ({
                id: e.id,
                name: e.description || "Expense",
                type: "Expense",
                amount: Number(e.amount),
                date: e.date,
                direction: "outbound" as const
            }));

            // Combine and sort by date descending
            const all = [...formattedIncome, ...formattedExpenses].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            // Stick to top 15
            setTransactions(all.slice(0, 15));
        } catch (error) {
            // Error fetching transactions - silently fail in production
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();

        // Subscribe to changes if needed, or just fetch once
        const incomeSub = supabase.channel('items_income')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'income' }, fetchTransactions)
            .subscribe();

        const expenseSub = supabase.channel('items_expenses')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchTransactions)
            .subscribe();

        return () => {
            supabase.removeChannel(incomeSub);
            supabase.removeChannel(expenseSub);
        }
    }, []);

    return (
        <div className="flex flex-col h-full w-full">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 px-6 pt-6 bg-[#0E0F12] sticky top-0 z-10">
                <h2 className="text-[18px] font-medium text-white">Recent Transactions</h2>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-0 text-white max-h-[350px]">
                {isLoading ? (
                    <div className="text-zinc-500 text-sm p-4 text-center">Loading...</div>
                ) : transactions.length === 0 ? (
                    <div className="text-zinc-500 text-sm p-4 text-center">No recent transactions.</div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-1">
                            {transactions.map((t, i) => (
                                <TransactionItem key={`${t.id}-${i}`} transaction={t} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
    const isInbound = transaction.direction === "inbound";

    return (
        <div className="group flex items-center justify-between p-4 hover:bg-white/5 transition-all cursor-default border-b border-white/5 last:border-0 border-l-2 border-l-transparent hover:border-l-orange-500">
            <div className="flex items-center gap-4">
                {/* Icon Circle */}
                <div className="h-10 w-10 rounded-full bg-zinc-800/80 flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-colors">
                    {isInbound ? (
                        <ArrowDownLeft className="text-orange-500" size={18} />
                    ) : (
                        <ArrowUpRight className="text-zinc-400" size={18} />
                    )}
                </div>

                {/* Text Info */}
                <div>
                    <p className="text-[14px] font-medium text-white mb-0.5">{transaction.name}</p>
                    <p className="text-[12px] text-zinc-500">{format(new Date(transaction.date), "MMM dd")} • {transaction.type}</p>
                </div>
            </div>

            {/* Amount */}
            <div className="text-right">
                <span className={cn(
                    "text-[14px] font-medium tracking-tight",
                    "text-orange-500" // Unified orange color
                )}>
                    {isInbound ? "+" : "-"}₹{Number(transaction.amount)?.toLocaleString() || "0.00"}
                </span>
            </div>
        </div>
    );
}
