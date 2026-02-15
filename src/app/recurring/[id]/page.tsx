"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, History, Plus, Pencil, Trash, Play, PauseCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { RetainerContract, ContractVersion, MonthlyInstance } from "@/types/retainer";
import { generateRetainerInstances } from "@/lib/retainer-logic";
import { format, addMonths, startOfMonth, isBefore } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EditMilestoneModal } from "@/components/retainer/edit-milestone-modal";

export default function RetainerDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [contract, setContract] = useState<RetainerContract | null>(null);
    const [versions, setVersions] = useState<ContractVersion[]>([]);
    const [instances, setInstances] = useState<MonthlyInstance[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // New/Edit Version State
    const [isNewVerOpen, setIsNewVerOpen] = useState(false);
    const [editingVersion, setEditingVersion] = useState<ContractVersion | null>(null);
    const [newPrice, setNewPrice] = useState("");
    const [effectiveDate, setEffectiveDate] = useState("");
    const [paymentStructureType, setPaymentStructureType] = useState("100");
    const [balanceOffset, setBalanceOffset] = useState("15");

    useEffect(() => {
        if (id) fetchData();
    }, [id]);

    const fetchData = async () => {
        setIsLoading(true);
        // 1. Contract
        const { data: c } = await supabase
            .from("retainer_contracts")
            .select("*, clients(name), services(name)")
            .eq("id", id)
            .single();
        if (c) setContract(c as unknown as RetainerContract);

        // 2. Versions
        const { data: v } = await supabase
            .from("contract_versions")
            .select("*")
            .eq("contract_id", id)
            .order("effective_start_date", { ascending: false });
        if (v) setVersions(v as unknown as ContractVersion[]);

        // 3. Instances
        if (v && v.length > 0) {
            const vIds = v.map((ver: any) => ver.id);
            const { data: i } = await supabase
                .from("monthly_instances")
                .select("*")
                .in("contract_version_id", vIds)
                .order("month_date", { ascending: false });
            if (i) setInstances(i as unknown as MonthlyInstance[]);
        }

        setIsLoading(false);
    };

    const handleEditVersionClick = (ver: ContractVersion) => {
        setEditingVersion(ver);
        setNewPrice(ver.monthly_price.toString());
        setEffectiveDate(ver.effective_start_date);

        // Detect structure
        if (ver.payment_structure && ver.payment_structure.length > 0) {
            setPaymentStructureType("50_50");
            const remainder = ver.payment_structure.find(s => s.type === 'remainder');
            if (remainder) setBalanceOffset(remainder.day_offset.toString());
        } else {
            setPaymentStructureType("100");
            setBalanceOffset("15");
        }

        setIsNewVerOpen(true);
    };

    const handleDeleteVersion = async (verId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this version? This might affect existing billing instances.")) return;

        const { error } = await supabase.from('contract_versions').delete().eq('id', verId);
        if (error) {
            alert("Error deleting version: " + error.message);
        } else {
            fetchData();
        }
    };

    const handleNewVersion = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prepare Structure
        let structure: any[] = [];
        if (paymentStructureType === "50_50") {
            structure = [
                { name: "Advance (50%)", type: "percent", value: 50, day_offset: 0 },
                { name: "Balance (50%)", type: "remainder", day_offset: parseInt(balanceOffset) || 15 }
            ];
        }

        try {
            if (editingVersion) {
                // Update Logic
                const { error } = await supabase
                    .from("contract_versions")
                    .update({
                        monthly_price: parseFloat(newPrice),
                        effective_start_date: effectiveDate,
                        payment_structure: structure
                    })
                    .eq('id', editingVersion.id);

                if (error) throw error;
            } else {
                // Create Logic (Simplified)
                const { error } = await supabase
                    .from("contract_versions")
                    .insert({
                        contract_id: id,
                        monthly_price: parseFloat(newPrice),
                        effective_start_date: effectiveDate,
                        payment_structure: structure
                    });

                if (error) throw error;
            }

            // Cleanup
            setIsNewVerOpen(false);
            setEditingVersion(null);
            setNewPrice("");
            setEffectiveDate("");
            setPaymentStructureType("100");

            // Trigger system regeneration
            await generateRetainerInstances();

            // Refresh UI
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const [selectedInstance, setSelectedInstance] = useState<MonthlyInstance | null>(null);
    const [selectedInstanceMilestones, setSelectedInstanceMilestones] = useState<any[]>([]);
    const [editMilestone, setEditMilestone] = useState<any | null>(null);

    const handleViewInstance = async (inst: MonthlyInstance) => {
        setSelectedInstance(inst);
        const { data } = await supabase.from('income').select('*').eq('retainer_instance_id', inst.id);
        if (data) setSelectedInstanceMilestones(data);
    };

    const handleMarkMilestonePaid = async (ms: any) => {
        const newStatus = ms.status === 'RECEIVED' ? 'EXPECTED' : 'RECEIVED';
        const { error } = await supabase.from('income').update({ status: newStatus }).eq('id', ms.id);

        if (error) {
            alert("Error updating status: " + error.message);
        } else {
            if (selectedInstance) handleViewInstance(selectedInstance);
            fetchData();
        }
    };

    // Title Edit State
    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState("");

    const handleUpdateName = async () => {
        if (!editedName.trim() || !contract) return;

        // 1. Update Contract Name
        const { error } = await supabase.from('retainer_contracts').update({ name: editedName }).eq('id', id);
        if (error) {
            alert("Error updating name: " + error.message);
            return;
        }

        // 2. Cascade Update to Income Descriptions
        // Fetch all versions -> instances -> to target income entries
        const { data: versions } = await supabase.from('contract_versions').select('id').eq('contract_id', id);
        if (versions && versions.length > 0) {
            const versionIds = versions.map(v => v.id);

            const { data: instances } = await supabase.from('monthly_instances').select('id').in('contract_version_id', versionIds);

            if (instances && instances.length > 0) {
                const instanceIds = instances.map(i => i.id);

                // Fetch income entries to get distinct milestone_labels
                const { data: incomeEntries } = await supabase
                    .from('income')
                    .select('milestone_label')
                    .in('retainer_instance_id', instanceIds);

                if (incomeEntries && incomeEntries.length > 0) {
                    // Group updates by milestone_label for efficiency
                    const labels = Array.from(new Set(incomeEntries.map((i: any) => i.milestone_label).filter(Boolean)));

                    for (const label of labels) {
                        await supabase
                            .from('income')
                            .update({ description: `${editedName} - ${label}` })
                            .in('retainer_instance_id', instanceIds)
                            .eq('milestone_label', label);
                    }
                }
            }
        }

        setContract({ ...contract, name: editedName });
        setIsEditingName(false);
    };

    const handleTogglePause = async () => {
        if (!contract) return;
        const isPaused = contract.status === 'paused';

        if (!isPaused) {
            if (!confirm("Are you sure you want to PAUSE this contract?\n\n- No new invoices will be generated.\n- You can resume at any time.")) return;

            const { error } = await supabase
                .from('retainer_contracts')
                .update({ status: 'paused' })
                .eq('id', id);

            if (error) {
                alert("Error pausing: " + error.message);
            } else {
                setContract({ ...contract, status: 'paused' });
                fetchData();
            }
        } else {
            if (!confirm("Are you sure you want to RESUME this contract?\n\n- We will check for missed months and mark them as 'skipped'.\n- The current month's invoice will be generated if missing.")) return;

            setIsLoading(true);
            try {
                // 1. Identify Gap
                let lastInstanceDate = instances.length > 0 ? new Date(instances[0].month_date) : null;

                if (lastInstanceDate) {
                    const today = new Date();
                    const currentMonthStart = startOfMonth(today);

                    // Start checking from the month AFTER the last instance
                    let nextMonthToCheck = startOfMonth(addMonths(lastInstanceDate, 1));

                    const skippedMonths = [];
                    // Populate gap months strictly BEFORE current month
                    while (isBefore(nextMonthToCheck, currentMonthStart)) {
                        skippedMonths.push(nextMonthToCheck);
                        nextMonthToCheck = addMonths(nextMonthToCheck, 1);
                    }

                    if (skippedMonths.length > 0) {
                        const inserts = skippedMonths.map(date => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            // Find version active at that date (versions sorted desc)
                            const ver = versions.find(v => v.effective_start_date <= dateStr);
                            if (!ver) return null;

                            return {
                                contract_version_id: ver.id,
                                month_date: dateStr,
                                total_due: 0,
                                status: 'skipped'
                            };
                        }).filter(Boolean);

                        if (inserts.length > 0) {
                            const { error: insError } = await supabase.from('monthly_instances').insert(inserts);
                            if (insError) throw insError;
                        }
                    }
                }

                // 2. Set Active
                const { error: upError } = await supabase
                    .from('retainer_contracts')
                    .update({ status: 'active' })
                    .eq('id', id);
                if (upError) throw upError;

                // 3. Trigger Generation
                await generateRetainerInstances();

                // 4. Refresh
                await fetchData();

            } catch (err: any) {
                alert("Error resuming: " + err.message);
                setIsLoading(false);
            }
        }
    };

    if (isLoading) return <div className="p-8 text-white">Loading details...</div>;
    if (!contract) return <div className="p-8 text-white">Contract not found.</div>;

    return (
        <div className="min-h-screen bg-transparent p-8 font-sans text-foreground">
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
                                />
                                <Button size="sm" onClick={handleUpdateName} className="bg-orange-500 hover:bg-orange-600 h-9">Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)} className="h-9">Cancel</Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 group">
                                <h1 className="text-2xl font-bold text-white">
                                    {contract.name}
                                </h1>
                                <button
                                    onClick={() => {
                                        setEditedName(contract.name);
                                        setIsEditingName(true);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-white"
                                >
                                    <Pencil size={16} />
                                </button>
                                <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10 capitalize ml-2">
                                    {contract.status}
                                </Badge>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className={cn(
                                        "h-6 gap-1 ml-2 transition-colors",
                                        contract.status === 'active'
                                            ? "text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10"
                                            : "text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                    )}
                                    onClick={handleTogglePause}
                                    title={contract.status === 'active' ? "Pause Contract" : "Resume Contract"}
                                >
                                    {contract.status === 'active' ? <PauseCircle size={16} /> : <Play size={16} />}
                                    <span className="text-xs">{contract.status === 'active' ? "Pause" : "Resume"}</span>
                                </Button>
                            </div>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm">{contract.clients?.name} • {contract.services?.name}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Versions History */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Clock size={16} className="text-orange-500" /> Version History
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10"
                            onClick={() => {
                                setEditingVersion(null);
                                setNewPrice("");
                                setEffectiveDate("");
                                setIsNewVerOpen(true);
                            }}
                        >
                            <Plus size={14} className="mr-1" /> New Price
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {versions.map((ver, idx) => (
                            <Card key={ver.id} className={`bg-card border-white/5 ${idx === 0 ? 'border-orange-500/30' : ''} group relative`}>
                                <CardContent className="p-4">
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-white" onClick={() => handleEditVersionClick(ver)}>
                                            <Pencil size={12} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-400" onClick={(e) => handleDeleteVersion(ver.id, e)}>
                                            <Trash size={12} />
                                        </Button>
                                    </div>

                                    <div className="flex justify-between items-start mb-2 pr-12">
                                        <div className="text-2xl font-bold text-white">
                                            ${ver.monthly_price.toLocaleString()}
                                            <span className="text-sm text-zinc-500 font-normal ml-1">/mo</span>
                                        </div>
                                        {idx === 0 && <Badge className="bg-orange-500 text-white hover:bg-orange-600">Current</Badge>}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        Effective from <span className="text-zinc-300">{format(new Date(ver.effective_start_date), "MMM d, yyyy")}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Right: Instance History */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <History size={16} className="text-blue-500" /> Billing History
                    </h2>

                    <div className="bg-card border border-white/5 rounded-xl overflow-hidden">
                        {instances.map((inst) => (
                            <div key={inst.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer"
                                    onClick={() => handleViewInstance(inst)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold text-xs uppercase">
                                            {format(new Date(inst.month_date), "MMM")}
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{format(new Date(inst.month_date), "MMMM yyyy")}</div>
                                            <div className="text-xs text-zinc-500">
                                                {selectedInstance?.id === inst.id ? "Showing Breakdown below" : "Click to view breakdown"}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono text-white">${inst.total_due.toLocaleString()}</div>
                                        <Badge variant="secondary" className="text-[10px] h-5 bg-zinc-800 text-zinc-400">
                                            {inst.status}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Expanded Breakdown */}
                                {selectedInstance?.id === inst.id && (
                                    <div className="bg-zinc-900/50 p-4 pl-16 border-t border-white/5">
                                        <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Generated Milestones</h4>
                                        <div className="space-y-2">
                                            {selectedInstanceMilestones.map((ms: any) => (
                                                <div key={ms.id} className="flex items-center justify-between text-sm bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <div>
                                                        <div className="text-white">{ms.milestone_label}</div>
                                                        <div className="text-xs text-zinc-500">{format(new Date(ms.date), "MMM d, yyyy")}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-white font-mono">${ms.amount.toLocaleString()}</div>
                                                        <Badge className={cn("text-[10px]", ms.status === 'RECEIVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500')}>
                                                            {ms.status}
                                                        </Badge>
                                                        {/* Quick Actions */}
                                                        <div className="flex items-center border-l border-white/10 pl-2 ml-2 gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className={cn("h-6 w-6 p-0 hover:text-white", ms.status === 'RECEIVED' ? "text-emerald-500" : "text-zinc-400")}
                                                                title="Mark as Paid"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleMarkMilestonePaid(ms);
                                                                }}
                                                            >
                                                                {/* Check Icon */}
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditMilestone(ms);
                                                                }}
                                                            >
                                                                <Clock size={12} />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {selectedInstanceMilestones.length === 0 && <div className="text-zinc-500 italic text-xs">No milestones found.</div>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Edit Milestone Modal */}
                <EditMilestoneModal
                    milestone={editMilestone}
                    isOpen={!!editMilestone}
                    onClose={() => setEditMilestone(null)}
                    onSave={() => {
                        // Refresh data
                        if (selectedInstance) handleViewInstance(selectedInstance);
                        fetchData();
                    }}
                />
            </div>

            {/* Modal */}
            <Dialog open={isNewVerOpen} onOpenChange={setIsNewVerOpen}>
                <DialogContent className="bg-card border-white/10 text-foreground">
                    <DialogHeader>
                        <DialogTitle>{editingVersion ? "Edit Price Version" : "Update Retainer Price"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleNewVersion} className="space-y-4 py-4">
                        {!editingVersion && <p className="text-sm text-zinc-400">
                            This will create a <strong>Version {versions.length + 1}</strong> of the contract.
                            Past months will remain unchanged. Future months will use the new price.
                        </p>}
                        {editingVersion && <p className="text-sm text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                            <strong>Warning:</strong> Editing a version that has already generated billing instances may result in discrepancies. Updates will apply to future generations.
                        </p>}

                        <div className="space-y-2">
                            <Label>New Monthly Price</Label>
                            <Input
                                type="number"
                                className="bg-white/5 border-white/10"
                                value={newPrice}
                                onChange={e => setNewPrice(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2 flex flex-col">
                            <Label>Effective Date</Label>
                            <DatePicker
                                date={effectiveDate ? new Date(effectiveDate) : undefined}
                                setDate={(d: Date | undefined) => setEffectiveDate(d ? format(d, "yyyy-MM-dd") : "")}
                                className="bg-zinc-900/50 border-white/10 w-full"
                            />
                        </div>

                        <div className="space-y-4 pt-2 border-t border-white/10">
                            <Label>Payment Structure</Label>
                            <div className="flex gap-4">
                                <label className={cn(
                                    "flex-1 cursor-pointer border rounded-lg p-3 text-sm transition-all text-center",
                                    paymentStructureType === "100"
                                        ? "bg-orange-500/20 border-orange-500 text-orange-200"
                                        : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                                )}>
                                    <input
                                        type="radio"
                                        className="hidden"
                                        name="struct"
                                        value="100"
                                        checked={paymentStructureType === "100"}
                                        onChange={() => setPaymentStructureType("100")}
                                    />
                                    100% Upfront
                                </label>
                                <label className={cn(
                                    "flex-1 cursor-pointer border rounded-lg p-3 text-sm transition-all text-center",
                                    paymentStructureType === "50_50"
                                        ? "bg-orange-500/20 border-orange-500 text-orange-200"
                                        : "bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10"
                                )}>
                                    <input
                                        type="radio"
                                        className="hidden"
                                        name="struct"
                                        value="50_50"
                                        checked={paymentStructureType === "50_50"}
                                        onChange={() => setPaymentStructureType("50_50")}
                                    />
                                    50% Advance / 50% Later
                                </label>
                            </div>
                        </div>

                        {paymentStructureType === "50_50" && (
                            <div className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/10 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-xs text-zinc-400">Balance Due (Days after start)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        className="bg-zinc-900 border-white/10 w-24"
                                        value={balanceOffset}
                                        onChange={e => setBalanceOffset(e.target.value)}
                                        min={0}
                                        required
                                    />
                                    <span className="text-sm text-zinc-500">days later</span>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsNewVerOpen(false)}>Cancel</Button>
                            <Button type="submit" className="bg-orange-500 hover:bg-orange-600">{editingVersion ? "Update Version" : "Save New Version"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
