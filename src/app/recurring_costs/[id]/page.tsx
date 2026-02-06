"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, History, Trash, PlayCircle, PauseCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function RecurringRuleDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [rule, setRule] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            setIsLoading(true);

            // 1. Fetch Rule
            const { data: ruleData, error: ruleError } = await supabase
                .from('recurring_expense_rules')
                .select('*')
                .eq('id', id)
                .single();

            if (ruleError) {
                console.error("Error fetching rule:", ruleError);
                return;
            }
            setRule(ruleData);

            // 2. Fetch History (Generated Instances)
            const { data: historyData, error: historyError } = await supabase
                .from('expenses')
                .select('*')
                .eq('recurring_rule_id', id)
                .order('date', { ascending: false });

            if (historyData) setHistory(historyData);

            setIsLoading(false);
        };

        fetchData();
    }, [id]);

    const toggleStatus = async () => {
        const { error } = await supabase
            .from('recurring_expense_rules')
            .update({ active: !rule.active })
            .eq('id', id);

        if (!error) setRule({ ...rule, active: !rule.active });
    };

    const handleDelete = async () => {
        if (!confirm("Delete this rule? History will be preserved, but future scheduled items will be removed.")) return;

        // 1. Delete SCHEDULED items
        await supabase
            .from('expenses')
            .delete()
            .eq('recurring_rule_id', id)
            .eq('status', 'SCHEDULED');

        // 2. Delete Rule
        const { error } = await supabase.from('recurring_expense_rules').delete().eq('id', id);
        if (error) {
            alert("Could not delete rule. It might have active history constraints.");
        } else {
            router.push('/recurring_costs');
        }
    };

    if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;
    if (!rule) return <div className="p-10 text-center text-muted-foreground">Rule not found</div>;

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-8">
            <div className="max-w-5xl mx-auto">
                <Button
                    variant="ghost"
                    className="mb-6 pl-0 hover:bg-transparent hover:text-white text-muted-foreground transition-colors"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Recurring
                </Button>

                <div className="flex justify-between items-start mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold tracking-tight text-white">{rule.name}</h1>
                            <Badge variant="outline" className={`border-white/10 ${rule.active ? 'text-emerald-500 bg-emerald-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
                                {rule.active ? 'Active' : 'Paused'}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">{rule.vendor} • {rule.category}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="bg-white/5 border-white/10 hover:bg-white/10"
                            onClick={toggleStatus}
                        >
                            {rule.active ? <><PauseCircle size={16} className="mr-2" /> Pause Rule</> : <><PlayCircle size={16} className="mr-2" /> Resume Rule</>}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => setIsDeleteModalOpen(true)}
                        >
                            <Trash size={16} className="mr-2" /> Delete
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-card border-white/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Amount</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">₹{rule.amount.toLocaleString()}</div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-white/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Schedule</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">
                                {rule.due_day}{getOrdinal(rule.due_day)}
                                <span className="text-sm font-normal text-muted-foreground ml-2">of every month</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-card border-white/5">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Generated Instances</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-white">{history ? history.length : 0}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <History size={18} /> Payment History
                    </h2>

                    <div className="rounded-xl border border-white/5 bg-card overflow-hidden">
                        {history.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">No history generated yet.</div>
                        ) : (
                            history.map((item) => (
                                <div key={item.id} className="group flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500 border border-white/5">
                                            <span className="font-bold text-xs">{format(new Date(item.date), "MMM")}</span>
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{format(new Date(item.date), "dd MMMM yyyy")}</div>
                                            <div className="text-xs text-muted-foreground">{item.description}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <Badge variant="outline" className={`border-white/10 capitalize ${getStatusColor(item.status)}`}>
                                            {item.status}
                                        </Badge>
                                        <div className="font-mono font-bold text-white">₹{item.amount.toLocaleString()}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                    <DialogContent className="bg-zinc-900 border-white/10 text-white">
                        <DialogHeader>
                            <DialogTitle>Delete Recurring Rule?</DialogTitle>
                            <DialogDescription>
                                This will stop future billing. All past generated expenses (history) will be preserved.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDelete}>Delete Rule</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

function getOrdinal(n: number) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

function getStatusColor(status: string) {
    switch (status?.toLowerCase()) {
        case 'paid': return "text-emerald-500 bg-emerald-500/10";
        case 'pending': return "text-amber-500 bg-amber-500/10";
        case 'scheduled': return "text-blue-500 bg-blue-500/10";
        default: return "text-zinc-500 bg-zinc-500/10";
    }
}
