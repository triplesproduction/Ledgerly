"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, FileText, Calendar, IndianRupee, Trash2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { RetainerContract } from "@/types/retainer";
import { generateRetainerInstances } from "@/lib/retainer-logic";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { ClientSelector } from "@/components/ui/client-selector";
import { ServiceSelector } from "@/components/ui/service-selector";

export default function RetainersPage() {
    const [contracts, setContracts] = useState<RetainerContract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        clientId: null as string | null,
        clientName: "",
        serviceId: null as string | null,
        serviceName: "",
        name: "",
        monthlyPrice: "",
        startDate: new Date(),
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        // Fetch Contracts
        const { data } = await supabase
            .from("retainer_contracts")
            .select(`
                *,
                clients (name),
                services (name)
            `)
            .order("created_at", { ascending: false });

        if (data) setContracts(data as unknown as RetainerContract[]);
        setIsLoading(false);
    };

    const handleCreateContract = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.clientId || !formData.serviceId || !formData.name || !formData.monthlyPrice) {
            alert("Please fill in all required fields.");
            return;
        }

        try {
            // 1. Create Contract
            const { data: contract, error: conError } = await supabase
                .from("retainer_contracts")
                .insert({
                    client_id: formData.clientId,
                    service_id: formData.serviceId,
                    name: formData.name,
                    status: 'active'
                })
                .select()
                .single();

            if (conError) throw conError;

            // 2. Create V1 Version
            const { error: verError } = await supabase
                .from("contract_versions")
                .insert({
                    contract_id: contract.id,
                    monthly_price: parseFloat(formData.monthlyPrice),
                    effective_start_date: format(formData.startDate, 'yyyy-MM-dd'),
                    payment_structure: [] // Default to 100% upfront for now
                });

            if (verError) throw verError;

            // Success
            setIsAddOpen(false);
            setFormData({
                clientId: null,
                clientName: "",
                serviceId: null,
                serviceName: "",
                name: "",
                monthlyPrice: "",
                startDate: new Date()
            });

            // Trigger generation
            await generateRetainerInstances();
            fetchData();

        } catch (error: any) {
            alert("Error creating contract: " + error.message);
        }
    };

    // Delete State
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteId(id);
    };

    const confirmDelete = async (keepEntries: boolean) => {
        if (!deleteId) return;
        setIsLoading(true);

        try {
            // 1. Fetch Hierarchy to identify Income
            const { data: versions } = await supabase.from('contract_versions').select('id').eq('contract_id', deleteId);
            const versionIds = versions?.map(v => v.id) || [];

            let instanceIds: string[] = [];
            if (versionIds.length > 0) {
                const { data: instances } = await supabase.from('monthly_instances').select('id').in('contract_version_id', versionIds);
                instanceIds = instances?.map(i => i.id) || [];
            }

            // 2. Handle Income Entries
            if (instanceIds.length > 0) {
                if (keepEntries) {
                    // Unlink Income (Set retainer_instance_id = NULL)
                    // They become standalone entries
                    const { error: incomeError } = await supabase
                        .from('income')
                        .update({ retainer_instance_id: null })
                        .in('retainer_instance_id', instanceIds);

                    if (incomeError) throw incomeError;
                } else {
                    // Delete Income
                    const { error: incomeError } = await supabase
                        .from('income')
                        .delete()
                        .in('retainer_instance_id', instanceIds);

                    if (incomeError) throw incomeError;
                }
            }

            // 3. Delete Contract (Cascade should handle versions/instances, but we'll manually cleanup to be safe/explicit or if cascade isn't set)
            // Assuming Supabase FKs are CASCADE, deleting contract is enough. 
            // If not, we'd delete instances -> versions -> contract. 
            // I'll delete the contract and let the DB handle cascade for internal retainer tables if configured, 
            // but manual cleanup is safer if uncertain. 
            // Given I don't know the schema validly, I will assume basic cascade OR manual cleanup of children.
            // Let's rely on standard 'ON DELETE CASCADE' for internal tables if they exist, but explicit delete is safer.

            // Delete Instances
            if (instanceIds.length > 0) {
                await supabase.from('monthly_instances').delete().in('id', instanceIds);
            }
            // Delete Versions
            if (versionIds.length > 0) {
                await supabase.from('contract_versions').delete().in('id', versionIds);
            }
            // Delete Contract
            const { error: delError } = await supabase.from('retainer_contracts').delete().eq('id', deleteId);
            if (delError) throw delError;

            // Success
            setDeleteId(null);
            fetchData();
        } catch (err: any) {
            alert("Error deleting contract: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-[28px] font-semibold tracking-tight text-foreground">Retainer Contracts</h1>
                    <p className="text-muted-foreground mt-1 text-[13px]">Manage long-term client engagements and billing versions.</p>
                </div>
                <Button
                    onClick={() => setIsAddOpen(true)}
                    className="rounded-full bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 px-6 font-semibold text-[13px]"
                >
                    <Plus size={18} className="mr-2" /> New Contract
                </Button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {contracts.map(contract => (
                    <div key={contract.id} className="bg-card border border-white/5 rounded-xl p-5 hover:border-orange-500/30 transition-all group relative">
                        <div className="absolute top-5 right-5 flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-zinc-600 hover:text-red-400 -mt-1 -mr-1"
                                onClick={(e) => handleDeleteClick(contract.id, e)}
                            >
                                <Trash2 size={14} />
                            </Button>
                        </div>

                        <div className="flex justify-between items-start mb-4 pr-8">
                            <div>
                                <h3 className="font-semibold text-lg text-white">{contract.name}</h3>
                                <p className="text-sm text-muted-foreground">{contract.clients?.name}</p>
                            </div>
                        </div>

                        <div className="mb-4">
                            <Badge variant="outline" className={cn(
                                "capitalize",
                                contract.status === 'active' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "text-zinc-500"
                            )}>
                                {contract.status}
                            </Badge>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center text-sm text-zinc-400">
                                <FileText size={14} className="mr-2 opacity-50" />
                                <span>{contract.services?.name || "General Service"}</span>
                            </div>
                            <div className="flex items-center text-sm text-zinc-400">
                                <Calendar size={14} className="mr-2 opacity-50" />
                                <span>Created {format(new Date(contract.created_at), "MMM d, yyyy")}</span>
                            </div>
                        </div>

                        <div className="mt-5 pt-4 border-t border-white/5 flex justify-between items-center cursor-pointer" onClick={() => window.location.href = `/recurring/${contract.id}`}>
                            <span className="text-xs text-zinc-500 font-medium tracking-wide uppercase">Manage</span>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-white/10 text-zinc-400">
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {contracts.length === 0 && !isLoading && (
                <div className="text-center py-20 text-muted-foreground bg-card/50 rounded-xl border border-white/5 border-dashed">
                    <p>No active retainer contracts found.</p>
                    <Button variant="link" onClick={() => setIsAddOpen(true)} className="text-orange-500">Create one now</Button>
                </div>
            )}

            {/* Add Modal */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create Retainer Contract</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateContract}>
                        <div className="grid gap-5 py-4">
                            <div className="grid gap-2">
                                <Label>Contract Name</Label>
                                <Input
                                    placeholder="e.g. Monthly SEO Retainer"
                                    className="bg-white/5 border-white/10 h-10"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Client</Label>
                                <ClientSelector
                                    value={formData.clientId}
                                    onChange={(id, name) => setFormData({ ...formData, clientId: id, clientName: name })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Service</Label>
                                <ServiceSelector
                                    value={formData.serviceId}
                                    onChange={(id, name) => setFormData({ ...formData, serviceId: id, serviceName: name })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Monthly Price</Label>
                                    <div className="relative">
                                        <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <Input
                                            type="number"
                                            className="pl-9 bg-white/5 border-white/10 h-10"
                                            value={formData.monthlyPrice}
                                            onChange={e => setFormData({ ...formData, monthlyPrice: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Start Date</Label>
                                    <DatePicker
                                        date={formData.startDate}
                                        setDate={(d) => d && setFormData({ ...formData, startDate: d })}
                                        className="w-full bg-white/5 border-white/10 h-10"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
                            <div></div>
                            <div className="flex items-center gap-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setIsAddOpen(false)}
                                    className="h-11 text-zinc-400 hover:text-white hover:bg-white/5 px-6 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/20 px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Create Contract
                                </Button>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent className="bg-[#16171D] border-white/10 text-foreground sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">Delete Contract</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-zinc-400 text-sm space-y-4">
                        <p>
                            You are about to delete <span className="text-white font-medium">{contracts.find(c => c.id === deleteId)?.name}</span>.
                        </p>
                        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                            <h4 className="text-orange-400 font-medium mb-1 flex items-center gap-2">
                                <AlertTriangle size={16} /> Data Handling
                            </h4>
                            <p className="text-xs text-orange-200/70">
                                This contract has generated income entries. How would you like to handle them?
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:justify-start gap-2">
                        <div className="flex flex-col w-full gap-3">
                            <Button
                                variant="destructive"
                                onClick={() => confirmDelete(false)}
                                className="w-full justify-between"
                            >
                                <span>Delete Everything</span>
                                <span className="text-xs opacity-70 font-normal">Contract + Entries</span>
                            </Button>

                            <Button
                                variant="secondary"
                                onClick={() => confirmDelete(true)}
                                className="w-full justify-between bg-white/5 hover:bg-white/10 text-white"
                            >
                                <span>Delete Contract Only</span>
                                <span className="text-xs opacity-70 font-normal">Keep Entries</span>
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => setDeleteId(null)}
                                className="w-full mt-2"
                            >
                                Cancel
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
