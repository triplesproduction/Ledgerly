"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCcw, Calendar, IndianRupee, Tag, PlayCircle, PauseCircle, Trash, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { generateExpenseInstances } from "@/lib/recurring-expenses-logic";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

type RecurringRule = {
    id: string;
    name: string;
    vendor: string;
    amount: number;
    category: string;
    frequency: string;
    start_month: string;
    active: boolean;
    due_day: number;
};

export default function RecurringCostsPage() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [rules, setRules] = useState<RecurringRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        vendor: "", // Optional, defaults to Name
        amount: "",
        category: "Software",
        start_month: new Date(),
        due_day: "1"
    });

    const fetchRules = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('recurring_expense_rules')
            .select('*')
            .order('amount', { ascending: false });

        if (data) setRules(data);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const handleCreateRule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Update Rule
                const { error } = await supabase
                    .from('recurring_expense_rules')
                    .update({
                        name: formData.name,
                        vendor: formData.vendor || formData.name,
                        amount: parseFloat(formData.amount),
                        category: formData.category,
                        start_month: format(formData.start_month, 'yyyy-MM-dd'),
                        due_day: parseInt(formData.due_day),
                    })
                    .eq('id', editingId);

                if (error) throw error;

                // SYNC: Update all FUTURE/SCHEDULED expenses to match the new details
                // This ensures the dashboard forecast immediately reflects the new amount/name
                const { error: syncError } = await supabase
                    .from('expenses')
                    .update({
                        amount: parseFloat(formData.amount),
                        vendor: formData.vendor || formData.name,
                        category: formData.category,
                        description: `${formData.name} (Recurring)`
                    })
                    .eq('recurring_rule_id', editingId)
                    .eq('status', 'SCHEDULED');

                if (syncError) console.error("Failed to sync scheduled expenses:", syncError);

            } else {
                // Create
                const { error } = await supabase
                    .from('recurring_expense_rules')
                    .insert({
                        name: formData.name,
                        vendor: formData.vendor || formData.name,
                        amount: parseFloat(formData.amount),
                        category: formData.category,
                        start_month: format(formData.start_month, 'yyyy-MM-dd'),
                        due_day: parseInt(formData.due_day),
                        active: true,
                        frequency: 'monthly'
                    });

                if (error) throw error;
            }

            setIsAddModalOpen(false);
            resetForm();

            // Trigger generation immediately
            await generateExpenseInstances();
            fetchRules();

        } catch (err: any) {
            alert("Error saving rule: " + err.message);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            name: "",
            vendor: "",
            amount: "",
            category: "Software",
            start_month: new Date(),
            due_day: "1"
        });
    };

    const handleEditClick = (rule: RecurringRule) => {
        setEditingId(rule.id);
        setFormData({
            name: rule.name,
            vendor: rule.vendor,
            amount: rule.amount.toString(),
            category: rule.category,
            start_month: new Date(rule.start_month),
            due_day: rule.due_day.toString()
        });
        setIsAddModalOpen(true);
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase.from('recurring_expense_rules').update({ active: !currentStatus }).eq('id', id);
        if (!error) fetchRules();
    };

    const handleDeleteRule = async (id: string) => {
        if (!confirm("Are you sure you want to delete this recurring rule? This will remove future SCHEDULED expenses, but keep history.")) return;

        // 1. Delete associated FUTURE expenses only (Preserve History)
        const { error: expError } = await supabase
            .from('expenses')
            .delete()
            .eq('recurring_rule_id', id)
            .eq('status', 'SCHEDULED');

        if (expError) {
            console.error("Error cleaning up scheduled expenses:", expError);
        }

        // 2. Delete the rule
        const { error } = await supabase.from('recurring_expense_rules').delete().eq('id', id);
        if (error) {
            alert("Error deleting rule: " + error.message);
        } else {
            setIsAddModalOpen(false);
            fetchRules();
        }
    };

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Recurring Expenses</h1>
                    <p className="text-muted-foreground mt-1 text-[13px]">Manage fixed monthly obligations (Rent, Hosting, salaries).</p>
                </div>

                <Dialog open={isAddModalOpen} onOpenChange={(open) => {
                    setIsAddModalOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button
                            onClick={resetForm}
                            className="rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 px-6 font-semibold text-[13px]"
                        >
                            <Plus size={18} className="mr-2" /> Add Recurring Rule
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="text-foreground">{editingId ? "Edit Recurring Expense Rule" : "New Recurring Expense Rule"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateRule} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Internal Name</Label>
                                    <Input
                                        placeholder="e.g. AWS Bill"
                                        className="bg-white/5 border-white/10"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Vendor (Optional)</Label>
                                    <Input
                                        placeholder="Specific Vendor Name"
                                        className="bg-white/5 border-white/10"
                                        value={formData.vendor}
                                        onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Monthly Amount</Label>
                                    <div className="relative">
                                        <IndianRupee size={14} className="absolute left-3 top-3 text-zinc-500" />
                                        <Input
                                            type="number"
                                            className="pl-8 bg-white/5 border-white/10"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Input
                                        placeholder="e.g. Software, Rent"
                                        className="bg-white/5 border-white/10"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>First Payment Date</Label>
                                    <DatePicker
                                        date={formData.start_month}
                                        setDate={(d) => d && setFormData({ ...formData, start_month: d })}
                                        className="w-full bg-white/5 border-white/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Due Day of Month</Label>
                                    <Input
                                        type="number"
                                        min="1" max="31"
                                        className="bg-white/5 border-white/10"
                                        value={formData.due_day}
                                        onChange={e => setFormData({ ...formData, due_day: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className={cn("flex items-center px-6 py-4 border-t border-white/5", editingId ? "justify-between" : "justify-center")}>
                                <div>
                                    {editingId && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={(e) => handleDeleteRule(editingId)}
                                            className="h-11 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 rounded-xl flex items-center gap-2 transition-colors"
                                        >
                                            <Trash size={18} />
                                            <span className="font-medium">Delete</span>
                                        </Button>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="h-11 text-zinc-400 hover:text-white hover:bg-white/5 px-6 rounded-xl font-medium transition-colors"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/20 px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {editingId ? "Save Changes" : "Create Rule"}
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-3xl border border-white/5 bg-card overflow-hidden shadow-xl">
                <Table>
                    <TableHeader className="bg-white/5 hover:bg-white/5">
                        <TableRow className="border-white/5">
                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-6 h-12">Rule Name</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Amount</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Category</TableHead>
                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Schedule</TableHead>
                            <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground pr-6 h-12">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Loading rules...</TableCell></TableRow>
                        ) : rules.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No recurring rules yet.</TableCell></TableRow>
                        ) : (
                            rules.map((rule) => (
                                <TableRow key={rule.id} className="border-white/5 hover:bg-white/5 group transition-colors">
                                    <TableCell className="font-semibold text-foreground pl-6 py-4 flex items-center gap-3 text-[13px]">
                                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                                            <RefreshCcw size={14} />
                                        </div>
                                        <div>
                                            {rule.name}
                                            <div className="text-[10px] text-zinc-500 font-normal">{rule.vendor}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono font-medium text-foreground text-[13px]">
                                        ₹{rule.amount.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="border-white/10 text-zinc-400 font-normal text-[10px] bg-white/5">
                                            {rule.category}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-[13px] text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={12} className="opacity-70" />
                                            Due on {rule.due_day}{getOrdinal(rule.due_day)}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleStatus(rule.id, rule.active);
                                                }}
                                                className={cn("h-7 px-2 text-[11px] font-bold gap-1", rule.active ? "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20" : "text-zinc-500 bg-zinc-800 hover:bg-zinc-700")}
                                            >
                                                {rule.active ? <><PlayCircle size={12} /> Active</> : <><PauseCircle size={12} /> Paused</>}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditClick(rule);
                                                }}
                                                className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-white/10"
                                            >
                                                <Pencil size={14} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function getOrdinal(n: number) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}
