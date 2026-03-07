"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, History, Trash, PlayCircle, PauseCircle, Pencil, IndianRupee, RefreshCcw, Calendar, Tag, AlertTriangle, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { format, parseISO, addMonths, startOfMonth, endOfMonth, setDate, isBefore, isAfter } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { generateExpenseInstances } from "@/lib/recurring-expenses-logic";
import { cn } from "@/lib/utils";

export default function RecurringRuleDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [rule, setRule] = useState<any>(null);
    const [versions, setVersions] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Edit Rule Details State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        vendor: "",
        category: "",
        due_day: "1",
        start_month: "",
        auto_pay: false
    });

    // New Version State
    const [isNewVerOpen, setIsNewVerOpen] = useState(false);
    const [newAmount, setNewAmount] = useState("");
    const [effectiveDate, setEffectiveDate] = useState("");

    // Name Edit State
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");

    // Custom Entry State
    const [isCustomEntryModalOpen, setIsCustomEntryModalOpen] = useState(false);
    const [customEntryData, setCustomEntryData] = useState({
        date: new Date(),
        amount: "",
        status: "PAID"
    });

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
        setEditedName(ruleData.name);

        // 2. Fetch Versions
        const { data: versionData } = await supabase
            .from('recurring_expense_versions')
            .select('*')
            .eq('recurring_rule_id', id)
            .order('effective_from', { ascending: false });

        if (versionData) setVersions(versionData);

        // 3. Fetch History (Generated Instances)
        const { data: historyData } = await supabase
            .from('expenses')
            .select('*')
            .eq('recurring_rule_id', id)
            .order('date', { ascending: false });

        if (historyData) setHistory(historyData);

        setIsLoading(false);
    };

    useEffect(() => {
        if (!id) return;
        fetchData();
    }, [id]);

    const toggleStatus = async () => {
        const newStatus = !rule.active;
        const { error } = await supabase
            .from('recurring_expense_rules')
            .update({ active: newStatus })
            .eq('id', id);

        if (!error) {
            if (!newStatus) {
                // Changing to paused: Wipe out SCHEDULED items
                await supabase
                    .from('expenses')
                    .delete()
                    .eq('recurring_rule_id', id)
                    .eq('status', 'SCHEDULED');
            } else {
                // Changing to active: Regenerate
                await generateExpenseInstances();
            }

            setRule({ ...rule, active: newStatus });
            fetchData();
        }
    };

    const handleDelete = async () => {
        // 1. Delete SCHEDULED items
        await supabase
            .from('expenses')
            .delete()
            .eq('recurring_rule_id', id)
            .eq('status', 'SCHEDULED');

        // 2. Delete Rule (Cascade deletes versions)
        const { error } = await supabase.from('recurring_expense_rules').delete().eq('id', id);
        if (error) {
            alert("Could not delete rule.");
        } else {
            router.push('/recurring_costs');
        }
    };

    const handleUpdateName = async () => {
        if (!editedName.trim()) return;

        const { error } = await supabase
            .from('recurring_expense_rules')
            .update({ name: editedName })
            .eq('id', id);

        if (error) {
            alert("Error updating name: " + error.message);
        } else {
            // Sync future expenses description
            await supabase
                .from('expenses')
                .update({ description: `${editedName} (Recurring)` })
                .eq('recurring_rule_id', id)
                .eq('status', 'SCHEDULED');

            setRule({ ...rule, name: editedName });
            setIsEditingName(false);
        }
    };

    const openEditModal = () => {
        setFormData({
            name: rule.name,
            vendor: rule.vendor,
            category: rule.category,
            due_day: rule.due_day.toString(),
            start_month: rule.start_month, // e.g. "2026-01-01"
            auto_pay: rule.auto_pay
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateRule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const oldStartMonth = rule.start_month; // e.g. "2026-01-01"
            const newStartMonth = formData.start_month;

            // 1. Update rule in DB
            const { error } = await supabase
                .from('recurring_expense_rules')
                .update({
                    name: formData.name,
                    vendor: formData.vendor || formData.name,
                    category: formData.category,
                    due_day: parseInt(formData.due_day),
                    start_month: newStartMonth,
                    auto_pay: formData.auto_pay
                })
                .eq('id', id);

            if (error) throw error;

            // 2. Sync metadata on SCHEDULED future expenses
            await supabase
                .from('expenses')
                .update({
                    vendor: formData.vendor || formData.name,
                    category: formData.category,
                    description: `${formData.name} (Recurring)`
                })
                .eq('recurring_rule_id', id)
                .eq('status', 'SCHEDULED');

            // 3. Handle start_month change
            if (newStartMonth && oldStartMonth && newStartMonth !== oldStartMonth) {
                const oldStart = startOfMonth(parseISO(oldStartMonth));
                const newStart = startOfMonth(parseISO(newStartMonth));
                const dueDay = parseInt(formData.due_day);

                if (isBefore(newStart, oldStart)) {
                    // START DATE MOVED BACK → backfill missing months from newStart up to (but not including) oldStart
                    // Fetch current versions for amount lookup
                    const { data: vData } = await supabase
                        .from('recurring_expense_versions')
                        .select('*')
                        .eq('recurring_rule_id', id)
                        .order('effective_from', { ascending: true });

                    const fallbackAmount = rule.amount;
                    let cursor = newStart;

                    while (isBefore(cursor, oldStart)) {
                        const monthStr = format(cursor, 'yyyy-MM-dd');
                        const monthEnd = format(endOfMonth(cursor), 'yyyy-MM-dd');

                        // Idempotency: skip if already exists
                        const { count } = await supabase
                            .from('expenses')
                            .select('id', { count: 'exact', head: true })
                            .eq('recurring_rule_id', id)
                            .gte('date', monthStr)
                            .lte('date', monthEnd);

                        if (!count || count === 0) {
                            // Find the version effective for this month
                            let amount = fallbackAmount;
                            if (vData && vData.length > 0) {
                                const activeVer = vData.slice().reverse().find((v: any) =>
                                    !isAfter(startOfMonth(parseISO(v.effective_from)), cursor)
                                );
                                if (activeVer) amount = activeVer.amount;
                            }

                            const daysInMonth = endOfMonth(cursor).getDate();
                            const clampedDay = Math.min(dueDay, daysInMonth);
                            const dueDate = format(setDate(cursor, clampedDay), 'yyyy-MM-dd');

                            await supabase.from('expenses').insert({
                                recurring_rule_id: id,
                                date: dueDate,
                                amount,
                                description: `${formData.name} (Recurring)`,
                                vendor: formData.vendor || formData.name,
                                category: formData.category,
                                status: 'PAID' // Historical entries default to PAID
                            });
                        }

                        cursor = addMonths(cursor, 1);
                    }

                } else if (isAfter(newStart, oldStart)) {
                    // START DATE MOVED FORWARD → delete entries before the new start
                    const newStartStr = format(newStart, 'yyyy-MM-dd');
                    await supabase
                        .from('expenses')
                        .delete()
                        .eq('recurring_rule_id', id)
                        .lt('date', newStartStr);
                }
            }

            setIsEditModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert("Error updating rule: " + err.message);
        }
    };

    const handleCreateVersion = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('recurring_expense_versions').insert({
                recurring_rule_id: id,
                amount: parseFloat(newAmount),
                effective_from: effectiveDate // yyyy-MM-dd
            });

            if (error) throw error;

            // Delete already generated SCHEDULED expenses from effective date onward
            // so they get regenerated with the new price
            await supabase
                .from('expenses')
                .delete()
                .eq('recurring_rule_id', id)
                .eq('status', 'SCHEDULED')
                .gte('date', effectiveDate);

            // Trigger regeneration to recreate them with new price
            await generateExpenseInstances();

            setIsNewVerOpen(false);
            setNewAmount("");
            setEffectiveDate("");
            fetchData();

        } catch (err: any) {
            alert("Error creating version: " + err.message);
        }
    };

    const handleDeleteVersion = async (versionId: string) => {
        if (!confirm("Delete this price version?")) return;
        const { error } = await supabase.from('recurring_expense_versions').delete().eq('id', versionId);
        if (!error) {
            // Delete ALL SCHEDULED expenses so they are forced to regenerate 
            // after the version is removed
            await supabase
                .from('expenses')
                .delete()
                .eq('recurring_rule_id', id)
                .eq('status', 'SCHEDULED');

            await generateExpenseInstances(); // Re-sync
            fetchData();
        }
    };

    const handleCreateCustomEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('expenses').insert({
                recurring_rule_id: id,
                date: format(customEntryData.date, 'yyyy-MM-dd'),
                amount: parseFloat(customEntryData.amount),
                description: `${rule?.name} (Custom Entry)`,
                vendor: rule?.vendor || rule?.name,
                category: rule?.category,
                status: customEntryData.status,
                paid_date: customEntryData.status === 'PAID' ? format(new Date(), 'yyyy-MM-dd') : null
            });

            if (error) throw error;

            setIsCustomEntryModalOpen(false);
            setCustomEntryData({ date: new Date(), amount: "", status: "PAID" });
            fetchData();
        } catch (err: any) {
            alert("Error creating custom entry: " + err.message);
        }
    };

    const handleMarkExpensePaid = async (inst: any) => {
        const isCurrentlyPaid = inst.status === 'PAID';
        const newStatus = isCurrentlyPaid ? 'PENDING_PAYMENT' : 'PAID';
        const paidDate = isCurrentlyPaid ? null : format(new Date(), 'yyyy-MM-dd');

        const { error } = await supabase
            .from('expenses')
            .update({ status: newStatus, paid_date: paidDate })
            .eq('id', inst.id);

        if (error) {
            alert("Error updating status: " + error.message);
        } else {
            // Refresh local history list
            const updated = history.map(h => h.id === inst.id ? { ...h, status: newStatus, paid_date: paidDate } : h);
            setHistory(updated);
            // Also update the selected item in the expanded view
            if (selectedHistoryItem?.id === inst.id) {
                setSelectedHistoryItem({ ...inst, status: newStatus, paid_date: paidDate });
            }
        }
    };

    if (isLoading) return <div className="p-10 text-center text-muted-foreground">Loading...</div>;
    if (!rule) return <div className="p-10 text-center text-muted-foreground">Rule not found</div>;

    // Determine current price for display (first one in desc list that is effective <= today)
    const currentPrice = versions.find(v => !parseISO(v.effective_from).getTime() || parseISO(v.effective_from) <= new Date())?.amount || rule.amount;

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-zinc-400 hover:text-white">
                    <ArrowLeft size={20} />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    className="bg-white/5 border-white/10 text-white h-9 font-bold text-xl w-[400px]"
                                    autoFocus
                                />
                                <Button size="sm" onClick={handleUpdateName} className="bg-orange-500 hover:bg-orange-600 h-9">Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)} className="h-9">Cancel</Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 group">
                                <h1 className="text-2xl font-bold text-white">
                                    {rule.name}
                                </h1>
                                <button
                                    onClick={() => {
                                        setEditedName(rule.name);
                                        setIsEditingName(true);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-white"
                                >
                                    <Pencil size={16} />
                                </button>
                                <Badge variant="outline" className={`ml-2 capitalize border-white/10 ${rule.active ? 'text-emerald-500 bg-emerald-500/10' : 'text-amber-500 bg-amber-500/10'}`}>
                                    {rule.active ? 'Active' : 'Paused'}
                                </Badge>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className={cn(
                                        "h-6 gap-1 ml-2 transition-colors",
                                        rule.active
                                            ? "text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10"
                                            : "text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                    )}
                                    onClick={toggleStatus}
                                >
                                    {rule.active ? <PauseCircle size={16} /> : <PlayCircle size={16} />}
                                    <span className="text-xs">{rule.active ? "Pause" : "Resume"}</span>
                                </Button>
                            </div>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1"><RefreshCcw size={12} /> Monthly</span> •
                        <span className="flex items-center gap-1"><Tag size={12} /> {rule.category}</span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="space-y-6">

                    {/* Version History */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Clock size={16} className="text-orange-500" /> Version History
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
                                onClick={() => setIsNewVerOpen(true)}
                            >
                                <Plus size={14} className="mr-1" /> New Version
                            </Button>
                        </div>
                        {versions.length === 0 && (
                            <div className="text-zinc-500 text-sm italic">No versions found (Migrating...)</div>
                        )}
                        {versions.map((ver, idx) => {
                            const isEffective = parseISO(ver.effective_from) <= new Date();
                            // Quick heuristic for "Current": The most recent one that is effective
                            // Since list is ordered desc, the first one <= today is current.
                            // But we might have future ones.
                            // We'll just highlight the first one in the list as "Latest" if future, or "Current" if <= today.
                            return (
                                <Card key={ver.id} className={`bg-card border-white/5 group relative ${idx === 0 ? 'border-orange-500/20' : ''}`}>
                                    <CardContent className="p-4">
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-400" onClick={() => handleDeleteVersion(ver.id)}>
                                                <Trash size={12} />
                                            </Button>
                                        </div>
                                        <div className="flex justify-between items-start mb-2 pr-8">
                                            <div className="text-xl font-bold text-white">
                                                ₹{Number(ver.amount).toLocaleString()}
                                                <span className="text-sm text-zinc-500 font-normal ml-1">/mo</span>
                                            </div>
                                            {idx === 0 && <Badge className="bg-orange-500 text-white hover:bg-orange-600">Latest</Badge>}
                                        </div>
                                        <div className="text-xs text-zinc-500">
                                            Effective from <span className="text-zinc-300">{format(parseISO(ver.effective_from), "MMM d, yyyy")}</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>

                    {/* Rule Configuration */}
                    <div className="pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Tag size={16} className="text-zinc-500" /> Rule Details
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-zinc-400 hover:text-white hover:bg-white/5"
                                onClick={openEditModal}
                            >
                                <Pencil size={12} className="mr-1" /> Edit
                            </Button>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-card overflow-hidden divide-y divide-white/5">
                            {/* Vendor Row */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                    <Tag size={14} className="text-zinc-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Vendor</div>
                                    <div className="text-sm text-white font-medium truncate">{rule.vendor || "—"}</div>
                                </div>
                            </div>

                            {/* Category Row */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                    <IndianRupee size={14} className="text-zinc-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Category</div>
                                    <Badge variant="secondary" className="mt-0.5 bg-orange-500/10 text-orange-400 border-orange-500/20 font-normal text-xs">
                                        {rule.category}
                                    </Badge>
                                </div>
                            </div>

                            {/* Schedule Row */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                    <Calendar size={14} className="text-zinc-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Schedule</div>
                                    <div className="text-sm text-white font-medium">
                                        Due on <span className="text-orange-400">{rule.due_day}{getOrdinal(rule.due_day)}</span> of every month
                                    </div>
                                </div>
                            </div>

                            {/* Start Date Row */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                    <RefreshCcw size={14} className="text-zinc-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Active Since</div>
                                    <div className="text-sm text-white font-medium">{format(new Date(rule.start_month), "MMM d, yyyy")}</div>
                                </div>
                            </div>

                            {/* Payment Method Row */}
                            <div className="flex items-center gap-3 px-4 py-3">
                                <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                    <Clock size={14} className={rule.auto_pay ? "text-blue-400" : "text-zinc-400"} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Payment Method</div>
                                    <div className="text-sm text-white font-medium">
                                        {rule.auto_pay ? (
                                            <span className="text-blue-400">Auto Pay</span>
                                        ) : (
                                            "Manual Pay"
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 mt-8">
                        <h3 className="text-red-400 font-medium flex items-center gap-2 text-sm mb-2">
                            <AlertTriangle size={14} /> Danger Zone
                        </h3>
                        <p className="text-xs text-zinc-500 mb-3">
                            Deleting this rule will stop future billing but preserve history.
                        </p>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
                            onClick={() => setIsDeleteModalOpen(true)}
                        >
                            Delete Rule
                        </Button>
                    </div>
                </div>

                {/* Right: Billing History */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <History size={16} className="text-blue-500" /> Billing History
                        </h2>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 border-white/10 hover:bg-white/5 text-xs text-white"
                            onClick={() => setIsCustomEntryModalOpen(true)}
                        >
                            <Plus size={14} className="text-zinc-400" /> Custom Entry
                        </Button>
                    </div>

                    <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
                        {history.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">No history generated yet.</div>
                        ) : (
                            history.map((inst) => (
                                <div key={inst.id} className="border-b border-white/5 last:border-0">
                                    <div
                                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                        onClick={() => setSelectedHistoryItem(selectedHistoryItem?.id === inst.id ? null : inst)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold text-xs uppercase">
                                                {format(new Date(inst.date), "MMM")}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{format(new Date(inst.date), "MMMM yyyy")}</div>
                                                <div className="text-xs text-zinc-500">
                                                    {selectedHistoryItem?.id === inst.id ? "Showing breakdown below" : "Click to view breakdown"}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono text-white">₹{Number(inst.amount).toLocaleString()}</div>
                                            <Badge variant="outline" className={`mt-1 border-white/10 text-[10px] capitalize ${getStatusColor(inst.status)}`}>
                                                {inst.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Expanded Breakdown */}
                                    {selectedHistoryItem?.id === inst.id && (
                                        <div className="bg-zinc-900/50 p-4 pl-16 border-t border-white/5">
                                            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Expense Details</h4>
                                            <div className="bg-white/5 p-3 rounded-lg border border-white/5 space-y-3">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div>
                                                        <div className="text-white font-medium">{inst.description || rule?.name}</div>
                                                        <div className="text-xs text-zinc-500 mt-0.5">
                                                            Due: {format(new Date(inst.date), "MMM d, yyyy")}
                                                            {inst.paid_date && (
                                                                <span className="ml-2 text-emerald-500">• Paid: {format(new Date(inst.paid_date), "MMM d, yyyy")}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="font-mono text-white">₹{Number(inst.amount).toLocaleString()}</div>
                                                        <Badge className={cn("text-[10px]", inst.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' : inst.status === 'PENDING_PAYMENT' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500')}>
                                                            {inst.status}
                                                        </Badge>
                                                        {/* Mark Paid Toggle */}
                                                        <div className="flex items-center border-l border-white/10 pl-3 ml-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className={cn(
                                                                    "h-7 gap-1.5 text-xs px-2",
                                                                    inst.status === 'PAID'
                                                                        ? "text-emerald-500 hover:text-white hover:bg-white/10"
                                                                        : "text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                                                                )}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMarkExpensePaid(inst);
                                                                }}
                                                            >
                                                                {/* Check Icon */}
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                                {inst.status === 'PAID' ? 'Paid' : 'Mark Paid'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                                {inst.vendor && (
                                                    <div className="text-xs text-zinc-500 border-t border-white/5 pt-2">
                                                        Vendor: <span className="text-zinc-300">{inst.vendor}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div >

            {/* Edit Rule Details Modal */}
            < Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen} >
                <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[500px] w-[95vw] max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <DialogHeader>
                        <DialogTitle>Edit Rule Details</DialogTitle>
                        <DialogDescription>To change the Amount, add a new Version instead.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateRule} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Rule Name</Label>
                                <Input
                                    className="bg-white/5 border-white/10"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Vendor</Label>
                                <Input
                                    className="bg-white/5 border-white/10"
                                    value={formData.vendor}
                                    onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Input
                                className="bg-white/5 border-white/10"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Due Day</Label>
                            <Input
                                type="number"
                                min="1" max="31"
                                className="bg-white/5 border-white/10"
                                value={formData.due_day}
                                onChange={e => setFormData({ ...formData, due_day: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2 pt-2 border-t border-white/10">
                            <Label className="flex items-center gap-1.5">
                                <Calendar size={13} className="text-zinc-400" /> Start Date
                            </Label>
                            <DatePicker
                                date={formData.start_month ? new Date(formData.start_month) : undefined}
                                setDate={(d) => setFormData({ ...formData, start_month: d ? format(d, 'yyyy-MM-dd') : formData.start_month })}
                                className="w-full bg-white/5 border-white/10"
                            />
                            <p className="text-[11px] text-zinc-500">
                                Moving back → auto-generates past entries (marked PAID).
                                Moving forward → deletes entries before new start.
                            </p>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-white/10">
                            <Label>Payment Method</Label>
                            <select
                                className="w-full flex h-10 items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20"
                                value={formData.auto_pay ? "true" : "false"}
                                onChange={(e) => setFormData({ ...formData, auto_pay: e.target.value === "true" })}
                            >
                                <option value="false" className="bg-[#111] text-white">Manual Pay (You log it when paid)</option>
                                <option value="true" className="bg-[#111] text-white">Auto Pay (Automatically marked paid)</option>
                            </select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-orange-500 hover:bg-orange-600">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog >

            {/* Add Version Modal */}
            < Dialog open={isNewVerOpen} onOpenChange={setIsNewVerOpen} >
                <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[400px] w-[95vw] max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <DialogHeader>
                        <DialogTitle>Add New Price Version</DialogTitle>
                        <DialogDescription>Future expenses will use this new price starting from the effective date.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateVersion} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>New Monthly Amount</Label>
                            <div className="relative">
                                <IndianRupee size={14} className="absolute left-3 top-3 text-zinc-500" />
                                <Input
                                    type="number"
                                    className="pl-8 bg-white/5 border-white/10"
                                    value={newAmount}
                                    onChange={e => setNewAmount(e.target.value)}
                                    placeholder="e.g. 6000"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Effective From</Label>
                            <DatePicker
                                date={effectiveDate ? new Date(effectiveDate) : undefined}
                                setDate={(d) => d && setEffectiveDate(format(d, 'yyyy-MM-dd'))}
                                className="w-full bg-white/5 border-white/10"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsNewVerOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-orange-500 hover:bg-orange-600">Add Version</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog >

            {/* Add Custom Entry Modal */}
            <Dialog open={isCustomEntryModalOpen} onOpenChange={setIsCustomEntryModalOpen}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Add Custom Entry</DialogTitle>
                        <DialogDescription className="text-sm text-zinc-400">
                            Manually log a past or special transaction for this recurring series.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateCustomEntry} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Date</Label>
                            <DatePicker
                                date={customEntryData.date}
                                setDate={(date) => date && setCustomEntryData({ ...customEntryData, date })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Amount</Label>
                            <Input
                                type="number"
                                required
                                placeholder="e.g. 1500"
                                className="bg-white/5 border-white/10"
                                value={customEntryData.amount}
                                onChange={(e) => setCustomEntryData({ ...customEntryData, amount: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</Label>
                            <select
                                required
                                className="w-full flex h-10 items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-white/20"
                                value={customEntryData.status}
                                onChange={(e) => setCustomEntryData({ ...customEntryData, status: e.target.value })}
                            >
                                <option value="PAID" className="bg-[#111] text-white">Paid</option>
                                <option value="PENDING_PAYMENT" className="bg-[#111] text-white">Pending</option>
                                <option value="SCHEDULED" className="bg-[#111] text-white">Scheduled</option>
                            </select>
                        </div>
                        <DialogFooter className="mt-6 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setIsCustomEntryModalOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Entry</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Modal */}
            < Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen} >
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
            </Dialog >
        </div >
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


