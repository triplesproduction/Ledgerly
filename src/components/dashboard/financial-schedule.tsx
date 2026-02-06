"use client";

import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowDownLeft, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

export function FinancialSchedule() {
    const [activeTab, setActiveTab] = useState<"receivables" | "payables">("receivables");
    const [receivables, setReceivables] = useState<any[]>([]);
    const [payables, setPayables] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isReceiving = activeTab === "receivables";
    const activeList = isReceiving ? receivables : payables;

    const fetchData = async () => {
        setIsLoading(true);

        // Fetch Payables: Expenses that are NOT paid
        const { data: expenses } = await supabase
            .from('expenses')
            .select('*')
            .neq('status', 'PAID')
            .neq('status', 'ARCHIVED')
            .order('date', { ascending: true })
            .limit(50);

        // Fetch Receivables: Income that is NOT received
        const { data: income } = await supabase
            .from('income')
            .select('*, clients(name)')
            .neq('status', 'RECEIVED')
            .neq('status', 'ARCHIVED')
            .order('date', { ascending: true })
            .limit(50);

        if (expenses) {
            setPayables(expenses.map(item => ({
                id: item.id,
                vendor: item.vendor || item.description || "Unknown Vendor",
                service: item.service || item.category,
                amount: Number(item.amount),
                due: new Date(item.date).toLocaleDateString(),
                status: item.status || "SCHEDULED",
                type: 'payable'
            })));
        }

        if (income) {
            setReceivables(income.map(item => {
                // @ts-ignore
                const joinedClientName = item.clients?.name;

                let clientName = joinedClientName || "Unknown";
                let desc = item.description || "";

                if (!joinedClientName && item.description && item.description.includes(":")) {
                    clientName = item.description.split(":")[0].trim();
                    desc = item.description.split(":")[1].trim();
                } else if (joinedClientName) {
                    // If we have a real client name, use description as project
                    desc = item.description || "Project";
                }

                return {
                    id: item.id,
                    client: clientName || "Client",
                    project: desc || "Project",
                    amount: Number(item.amount),
                    due: new Date(item.date).toLocaleDateString(),
                    status: item.status || "EXPECTED",
                    type: 'receivable'
                };
            }));
        }

        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();

        // Realtime subscription
        const sub = supabase.channel('schedule-updates')
            .on('postgres_changes', { event: '*', schema: 'public' }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        }
    }, []);

    // Placeholder interaction for checking off items (optimistic UI)
    const handleCheck = async (item: any) => {
        if (item.type === 'receivable') {
            // NEW LOGIC: Insert NEW + Archive OLD
            if (!confirm("Mark as Received? This creates a new income entry.")) return;

            // 1. Fetch original details
            const { data: original, error: fetchError } = await supabase
                .from('income')
                .select('*')
                .eq('id', item.id)
                .single();

            if (fetchError || !original) {
                console.error("Error fetching item:", fetchError);
                return;
            }

            // SPECIAL LOGIC FOR RETAINER INSTANCES
            // If this item belongs to a retainer instance, we just update the status to match Retainer Detail Page behavior.
            // We do NOT want to archive/create new, because that breaks the link to the generated milestone.
            if (original.retainer_instance_id) {
                const { error: updateError } = await supabase
                    .from('income')
                    .update({ status: 'RECEIVED', date: format(new Date(), 'yyyy-MM-dd') })
                    .eq('id', item.id);

                if (updateError) {
                    console.error("Error updating retainer item:", updateError);
                    alert("Failed to update status.");
                } else {
                    fetchData();
                }
                return;
            }

            // STANDARD LOGIC (Archive Old + Create New)
            // 2. Insert NEW
            const { error: insertError } = await supabase.from('income').insert({
                amount: original.amount,
                description: original.description,
                category: original.category,
                client_id: original.client_id,
                service_id: original.service_id,
                payment_method: original.payment_method,
                recurring_rule_id: original.recurring_rule_id,
                is_recurring: false,
                date: format(new Date(), 'yyyy-MM-dd'),
                status: 'RECEIVED'
            });

            if (insertError) {
                console.error("Error creating new entry:", insertError);
                return;
            }

            // 3. Archive OLD
            const { error: archiveError } = await supabase
                .from('income')
                .update({
                    status: 'ARCHIVED',
                    description: original.description ? `${original.description} (Converted)` : '(Converted)'
                })
                .eq('id', item.id);

            if (archiveError) console.error("Error archiving:", archiveError);

            // Sync Logic (Retainer)
            // This block is now handled by the special logic above.
            // If the old one is ARCHIVED, it is technically "done" for the schedule, but the retainer instance needs to know.

            // Actually, if we archive the old one, the retainer instance might lose track if it sums up income.
            // PROPOSAL: The NEW item should inherit `retainer_instance_id`.
            // I will add `retainer_instance_id: original.retainer_instance_id` to the insert above.
            // This comment block is now outdated due to the new logic.

            fetchData();

        } else {
            // Expenses Logic (Simple Update for now, unless requested otherwise)
            const { error } = await supabase.from('expenses').update({
                status: 'PAID',
                date: new Date().toISOString()
            }).eq('id', item.id);

            if (error) console.error("Error updating expense:", error);
            else fetchData();
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-card border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header / Tabs */}
            <div className="p-1 bg-card border-b border-white/5 flex items-center">
                <button
                    onClick={() => setActiveTab("receivables")}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-semibold transition-all rounded-t-lg relative",
                        activeTab === "receivables"
                            ? "text-orange-500 bg-white/5"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                    )}
                >
                    <ArrowDownLeft size={14} className={activeTab === "receivables" ? "text-orange-500" : "text-zinc-600"} />
                    Expecting ({receivables.length})
                    {activeTab === "receivables" && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />}
                </button>
                <div className="w-px h-6 bg-white/10" />
                <button
                    onClick={() => setActiveTab("payables")}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 text-[13px] font-semibold transition-all rounded-t-lg relative",
                        activeTab === "payables"
                            ? "text-orange-500 bg-white/5"
                            : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                    )}
                >
                    <ArrowUpRight size={14} className={activeTab === "payables" ? "text-orange-500" : "text-zinc-600"} />
                    Upcoming Bills ({payables.length})
                    {activeTab === "payables" && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />}
                </button>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-card max-h-[350px]">
                {isLoading ? (
                    <div className="text-center py-10 text-xs text-muted-foreground">Syncing schedule...</div>
                ) : activeList.length === 0 ? (
                    <div className="text-center py-10 text-xs text-muted-foreground">No upcoming items found.</div>
                ) : (
                    activeList.map((item: any) => {
                        const isCompleted = item.status === 'PAID' || item.status === 'RECEIVED';

                        return (
                            <div
                                key={item.id}
                                className={cn(
                                    "group flex items-center justify-between p-3 rounded-xl border transition-all cursor-default relative overflow-hidden",
                                    isCompleted
                                        ? "bg-orange-500/5 border-orange-500/10"
                                        : "hover:bg-white/5 border-transparent hover:border-white/5"
                                )}
                            >
                                <div className="flex items-center gap-3 relative z-10">
                                    <button
                                        onClick={() => handleCheck(item)}
                                        disabled={isCompleted}
                                        className={cn(
                                            "h-10 w-10 rounded-full flex items-center justify-center border transition-all",
                                            isCompleted
                                                ? "bg-orange-500 text-black border-orange-500 scale-100"
                                                : isReceiving
                                                    ? "bg-orange-500/10 border-orange-500/20 text-orange-500 group-hover:border-orange-500/40 hover:bg-orange-500/20"
                                                    : "bg-zinc-800 border-white/10 text-zinc-400 group-hover:border-white/20 hover:bg-zinc-700"
                                        )}
                                    >
                                        {isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} className="opacity-50 group-hover:opacity-100" />}
                                    </button>

                                    <div className={cn("flex flex-col transition-all", isCompleted && "opacity-50")}>
                                        <span className={cn("text-[13px] font-semibold", isCompleted ? "text-zinc-400 line-through" : "text-zinc-100")}>
                                            {isReceiving ? item.client : item.vendor}
                                        </span>
                                        <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                                            {isReceiving ? item.project : item.service}
                                            {!isCompleted && (
                                                <>
                                                    <span className="h-1 w-1 rounded-full bg-zinc-700" />
                                                    <span className="text-zinc-400">Due {item.due}</span>
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right relative z-10">
                                    <div className={cn(
                                        "text-[14px] font-bold tracking-tight transition-all",
                                        isCompleted ? "text-zinc-500 line-through" : (isReceiving ? "text-orange-500" : "text-zinc-300")
                                    )}>
                                        {isReceiving ? '+' : '-'}₹{item.amount.toLocaleString()}
                                    </div>

                                    <Badge variant="outline" className={cn(
                                        "text-[9px] px-1.5 py-0 h-4 border-0 mt-1 transition-all",
                                        isCompleted
                                            ? "bg-orange-500/20 text-orange-500 font-bold"
                                            : item.status === 'OVERDUE' || item.status === 'DELAYED'
                                                ? "bg-red-500/20 text-red-500 font-bold"
                                                : "bg-zinc-800 text-zinc-500"
                                    )}>
                                        {item.status}
                                    </Badge>
                                </div>
                            </div>
                        );
                    })
                )}

                <div className="pt-2 pb-1 text-center">
                    <button className="text-[11px] font-medium text-muted-foreground hover:text-white transition-colors">
                        View Full Calendar
                    </button>
                </div>
            </div>
        </div>
    );
}
