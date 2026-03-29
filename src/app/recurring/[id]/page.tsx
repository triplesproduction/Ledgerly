"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, History, Plus, Pencil, Trash, Play, PauseCircle, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { RetainerContract, ContractVersion, MonthlyInstance } from "@/types/retainer";
import { generateRetainerInstances, calculateMilestones } from "@/lib/retainer-logic";
import { format, addMonths, startOfMonth, isBefore, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EditMilestoneModal } from "@/components/retainer/edit-milestone-modal";
import { BuyPackageDialog } from "@/components/retainer/buy-package-dialog";

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

    // Package State
    const [isPackageOpen, setIsPackageOpen] = useState(false);

    useEffect(() => {
        if (id) {
            fetchData();

            // Setup Realtime subscriptions to keep the dashboard in perfect sync
            const channel = supabase
                .channel(`retainer-${id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'retainer_contracts', filter: `id=eq.${id}` }, fetchData)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'contract_versions', filter: `contract_id=eq.${id}` }, fetchData)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'income', filter: `client_id=eq.${contract?.client_id}` }, fetchData)
                .subscribe();

            // We also need another channel for instances since they use version IDs
            // Simplified: Just use a less restrictive wildcard for now given the scope
            const instanceChannel = supabase
                .channel(`retainer-instances-${id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_instances' }, fetchData)
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
                supabase.removeChannel(instanceChannel);
            };
        }
    }, [id, contract?.client_id]);

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
                .order("month_date", { ascending: false })
                .order("created_at", { ascending: false });
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
            let versionId = editingVersion?.id;

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
                // Create Logic
                const { data: newVer, error } = await supabase
                    .from("contract_versions")
                    .insert({
                        contract_id: id,
                        monthly_price: parseFloat(newPrice),
                        effective_start_date: effectiveDate,
                        payment_structure: structure
                    })
                    .select()
                    .single();

                if (error) throw error;
                versionId = newVer.id;
            }

            // --- Enhanced Retroactive Update Logic ---
            // 1. Determine Scope & Find Candidate Instances
            if (versionId) {
                // Fetch ALL versions to calculate time ranges and identify all instances for this contract
                const { data: allVersions } = await supabase
                    .from("contract_versions")
                    .select("*")
                    .eq("contract_id", id)
                    .order("effective_start_date", { ascending: true });

                if (allVersions) {
                    const currentVerIndex = allVersions.findIndex(v => v.id === versionId);

                    if (currentVerIndex !== -1) {
                        const currentVer = allVersions[currentVerIndex];
                        const nextVer = allVersions[currentVerIndex + 1];

                        const startDate = parseISO(currentVer.effective_start_date);
                        const endDate = nextVer ? parseISO(nextVer.effective_start_date) : null;

                        // Get IDs of all versions for this contract to find ANY instance belonging to it
                        const allVersionIds = allVersions.map(v => v.id);

                        // Fetch ALL instances for this contract
                        const { data: candidateInstances } = await supabase
                            .from("monthly_instances")
                            .select("*")
                            .in("contract_version_id", allVersionIds);

                        if (candidateInstances && candidateInstances.length > 0) {
                            // Filter instances that fall within this version's effective window
                            const affectedInstances = candidateInstances.filter(inst => {
                                const mDate = parseISO(inst.month_date);
                                // Check if mDate >= startDate (using startOfMonth granularity)
                                const isAfterStart = !isBefore(startOfMonth(mDate), startOfMonth(startDate));
                                // Check if mDate < endDate
                                const isBeforeEnd = !endDate || isBefore(startOfMonth(mDate), startOfMonth(endDate));

                                return isAfterStart && isBeforeEnd;
                            });

                            if (affectedInstances.length > 0) {
                                const numericPrice = parseFloat(newPrice);

                                for (const instance of affectedInstances) {
                                    // A. Update Instance (Reassign Version + Update Total)
                                    // This "claims" the instance for this version if it was previously on an older one
                                    await supabase
                                        .from("monthly_instances")
                                        .update({
                                            total_due: numericPrice,
                                            contract_version_id: versionId
                                        })
                                        .eq("id", instance.id);

                                    // B. Recalculate intended milestones
                                    const intendedMilestones = calculateMilestones(
                                        numericPrice,
                                        structure,
                                        parseISO(instance.month_date)
                                    );

                                    // C. Fetch existing income entries
                                    const { data: existingIncome } = await supabase
                                        .from("income")
                                        .select("*")
                                        .eq("retainer_instance_id", instance.id)
                                        .order("created_at", { ascending: true });

                                    if (!existingIncome) continue;

                                    // D. Sync Income
                                    if (existingIncome.length === intendedMilestones.length) {
                                        for (let i = 0; i < existingIncome.length; i++) {
                                            const income = existingIncome[i];
                                            const milestone = intendedMilestones[i];

                                            await supabase
                                                .from("income")
                                                .update({
                                                    amount: milestone.amount,
                                                    description: `${contract?.name} - ${milestone.name}`,
                                                    milestone_label: milestone.name,
                                                    // Update date too, to ensure correctness if structure time changed
                                                    date: milestone.date
                                                })
                                                .eq("id", income.id);
                                        }
                                    } else {
                                        // Structure Mismatch -> Delete & Recreate
                                        await supabase.from("income").delete().eq("retainer_instance_id", instance.id);

                                        const newEntries = intendedMilestones.map(m => ({
                                            retainer_instance_id: instance.id,
                                            client_id: contract?.client_id,
                                            service_id: contract?.service_id,
                                            amount: m.amount,
                                            date: m.date,
                                            description: `${contract?.name} - ${m.name}`,
                                            category: 'Retainer',
                                            status: 'PENDING',
                                            milestone_label: m.name
                                        }));

                                        await supabase.from("income").insert(newEntries);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // --------------------------------

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
        if (selectedInstance?.id === inst.id) {
            setSelectedInstance(null);
            setSelectedInstanceMilestones([]);
            return;
        }

        // Fetch data FIRST before opening the UI!
        const { data } = await supabase.from('income').select('*').eq('retainer_instance_id', inst.id).order('date', { ascending: true });
        
        // If an instance is part of a bulk package, it won't have individual income rows to avoid ledger duplication.
        // We inject a virtual visual object to clearly indicate it's covered.
        if ((!data || data.length === 0) && inst.status === 'paid') {
            setSelectedInstanceMilestones([{
                id: 'virtual-package',
                milestone_label: 'Covered by Bulk Package',
                status: 'RECEIVED',
                date: inst.month_date,
                amount: inst.total_due,
                is_virtual: true
            }]);
        } else {
            setSelectedInstanceMilestones(data || []);
        }

        // Batch the update: Tell React to expand the UI ONLY after the milestones array is loaded.
        setSelectedInstance(inst);
    };

    const handleMarkMilestonePaid = async (ms: any) => {
        const newStatus = ms.status === 'RECEIVED' ? 'PENDING' : 'RECEIVED';
        const { error } = await supabase.from('income').update({ status: newStatus }).eq('id', ms.id);

        if (error) {
            alert("Error updating status: " + error.message);
        } else {
            // Also sync outer instance pill seamlessly
            const { data: siblingMs } = await supabase.from('income').select('status').eq('retainer_instance_id', ms.retainer_instance_id);
            if (siblingMs && siblingMs.length > 0) {
                 const allPaid = siblingMs.every(m => m.status === 'RECEIVED');
                 const partialPaid = siblingMs.some(m => m.status === 'RECEIVED');
                 
                 const isFutureMonth = new Date(ms.date) > new Date() && new Date(ms.date).getMonth() !== new Date().getMonth();
                 
                 const overallStatus = allPaid ? 'paid' : (partialPaid ? 'partial' : (isFutureMonth ? 'scheduled' : 'generated'));
                 await supabase.from('monthly_instances').update({ status: overallStatus }).eq('id', ms.retainer_instance_id);
            }

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
        try {
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

                        console.log("Updating income with new contract name:", editedName, "Labels:", labels);

                        for (const label of labels) {
                            // Update matching milestone_labels
                            const { error: updateError } = await supabase
                                .from('income')
                                .update({ description: `${editedName} - ${label}` })
                                .in('retainer_instance_id', instanceIds)
                                .eq('milestone_label', label);

                            if (updateError) console.error("Error updating income for label", label, updateError);
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error syncing income names:", err);
            // Non-blocking error, allow UI to update
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
                // Delete all projected entries (scheduled/generated) to clean up upcoming records
                const versionIds = versions.map(v => v.id);
                if (versionIds.length > 0) {
                    await supabase
                        .from('monthly_instances')
                        .delete()
                        .in('contract_version_id', versionIds)
                        .in('status', ['scheduled', 'generated']);
                }

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
        <div className="min-h-screen bg-transparent px-3 py-8 sm:p-8 font-sans text-foreground">
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
                                    className="bg-white/5 border-white/10 text-white h-9 font-bold text-xl w-full sm:w-[400px]"
                                />
                                <Button size="sm" onClick={handleUpdateName} className="bg-orange-500 hover:bg-orange-600 h-9">Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)} className="h-9">Cancel</Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 group">
                                <h1 className="text-xl sm:text-2xl font-bold text-white break-words">
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
                                <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/10 capitalize shrink-0">
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
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Clock size={16} className="text-orange-500 shrink-0" /> Version History
                        </h2>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-orange-500 hover:text-orange-400 hover:bg-orange-500/10 shrink-0"
                                onClick={() => {
                                    setEditingVersion(null);
                                    setNewPrice("");
                                    setEffectiveDate("");
                                    setIsNewVerOpen(true);
                                }}
                            >
                                <Plus size={14} className="mr-1" /> New Price
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="bg-emerald-500/10 text-emerald-500 hover:text-white hover:bg-emerald-500/20 border border-emerald-500/10 shrink-0"
                                onClick={() => setIsPackageOpen(true)}
                            >
                                <Package size={14} className="mr-1" /> Pay Package
                            </Button>
                        </div>
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
                                            ₹{ver.monthly_price.toLocaleString()}
                                            <span className="text-sm text-zinc-500 font-normal ml-1">/mo</span>
                                        </div>
                                        {idx === 0 && <Badge className="bg-orange-500 text-white hover:bg-orange-600">Current</Badge>}
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        Effective from <span className="text-zinc-300">{format(new Date(ver.effective_start_date), "MMM d, yyyy")}</span>
                                        {ver.effective_end_date && (
                                            <>
                                                <br />
                                                Expires <span className="text-zinc-300">{format(new Date(ver.effective_end_date), "MMM d, yyyy")}</span>
                                            </>
                                        )}
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
                                    <div className="text-right shrink-0">
                                        <div className="font-mono text-white text-sm sm:text-base">₹{inst.total_due.toLocaleString()}</div>
                                        <Badge variant="outline" className={cn(
                                            "text-[10px] h-5 capitalize shrink-0",
                                            (inst.status === 'generated' && new Date(inst.month_date) > new Date() && new Date(inst.month_date).getMonth() !== new Date().getMonth() ? 'scheduled' : inst.status) === 'paid' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                                            (inst.status === 'generated' && new Date(inst.month_date) > new Date() && new Date(inst.month_date).getMonth() !== new Date().getMonth() ? 'scheduled' : inst.status) === 'partial' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                            (inst.status === 'generated' && new Date(inst.month_date) > new Date() && new Date(inst.month_date).getMonth() !== new Date().getMonth() ? 'scheduled' : inst.status) === 'scheduled' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                                            inst.status === 'skipped' ? "bg-zinc-800 border-zinc-700 text-zinc-500" :
                                            "bg-zinc-800 border-zinc-700 text-zinc-400"
                                        )}>
                                            {inst.status === 'generated' && new Date(inst.month_date) > new Date() && new Date(inst.month_date).getMonth() !== new Date().getMonth() ? 'scheduled' : inst.status}
                                        </Badge>
                                        {versions.find(v => v.id === inst.contract_version_id)?.effective_end_date && (
                                            <Badge variant="outline" className="text-[10px] h-5 ml-2 border-orange-500/20 text-orange-400 bg-orange-500/5">
                                                Package
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Breakdown */}
                                {selectedInstance?.id === inst.id && (
                                    <div className="bg-zinc-900/50 p-3 sm:p-4 pl-4 sm:pl-16 border-t border-white/5">
                                        <h4 className="text-[10px] sm:text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Generated Milestones</h4>
                                        <div className="space-y-2">
                                            {selectedInstanceMilestones.map((ms: any) => (
                                                <div key={ms.id} className="flex items-center justify-between text-sm bg-white/5 p-2 rounded-lg border border-white/5">
                                                    <div>
                                                        <div className="text-white">{ms.milestone_label}</div>
                                                        <div className="text-xs text-zinc-500">{format(new Date(ms.date), "MMM d, yyyy")}</div>
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                                        <div className="text-white font-mono font-bold">₹{ms.amount.toLocaleString()}</div>
                                                        <Badge className={cn("text-[10px] w-fit", ms.status === 'RECEIVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500')}>
                                                            {ms.status}
                                                        </Badge>
                                                    </div>
                                                    {/* Quick Actions */}
                                                    {!ms.is_virtual && (
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
                                                    )}
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

            <BuyPackageDialog
                isOpen={isPackageOpen}
                onClose={() => setIsPackageOpen(false)}
                contract={contract}
                currentVersion={versions[0] || null} // Assuming versions are sorted desc by date, versions[0] is the current one
                onSuccess={() => {
                    fetchData();
                }}
            />

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
