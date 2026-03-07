"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, History, Trash, PlayCircle, PauseCircle, Pencil, IndianRupee, RefreshCcw, Calendar, Tag, AlertTriangle, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
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
        due_day: "1"
    });

    // New Version State
    const [isNewVerOpen, setIsNewVerOpen] = useState(false);
    const [newAmount, setNewAmount] = useState("");
    const [effectiveDate, setEffectiveDate] = useState("");

    // Name Edit State
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");

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
        const { error } = await supabase
            .from('recurring_expense_rules')
            .update({ active: !rule.active })
            .eq('id', id);

        if (!error) setRule({ ...rule, active: !rule.active });
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
            due_day: rule.due_day.toString()
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateRule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('recurring_expense_rules')
                .update({
                    name: formData.name,
                    vendor: formData.vendor || formData.name,
                    category: formData.category,
                    due_day: parseInt(formData.due_day),
                })
                .eq('id', id);

            if (error) throw error;

            // SYNC FUTURE EXPENSES
            const { error: syncError } = await supabase
                .from('expenses')
                .update({
                    vendor: formData.vendor || formData.name,
                    category: formData.category,
                    description: `${formData.name} (Recurring)`
                })
                .eq('recurring_rule_id', id)
                .eq('status', 'SCHEDULED');

            if (syncError) console.error("Failed to sync scheduled expenses:", syncError);

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

            // Trigger regeneration to update future expenses with new price
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
            await generateExpenseInstances(); // Re-sync
            fetchData();
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
                                                ₹{ver.amount.toLocaleString()}
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
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <History size={16} className="text-blue-500" /> Billing History
                    </h2>

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
                                            <div className="font-mono text-white">₹{inst.amount.toLocaleString()}</div>
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
                                                        <div className="font-mono text-white">₹{inst.amount.toLocaleString()}</div>
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


