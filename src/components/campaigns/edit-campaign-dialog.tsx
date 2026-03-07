"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, IndianRupee } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import type { Campaign } from "@/types/general";

interface EditCampaignDialogProps {
    campaign: Campaign;
    onSuccess: () => void;
}

export function EditCampaignDialog({ campaign, onSuccess }: EditCampaignDialogProps) {
    const [open, setOpen] = useState(false);
    const [clients, setClients] = useState<any[]>([]);

    // Form state
    const [name, setName] = useState(campaign.name);
    const [client, setClient] = useState("");
    const [budget, setBudget] = useState(campaign.budget.toString());
    const [status, setStatus] = useState(campaign.status || "Active");

    // Budget Allocations
    const [budgetTravel, setBudgetTravel] = useState(campaign.budget_travel?.toString() || "");
    const [budgetAcc, setBudgetAcc] = useState(campaign.budget_accommodation?.toString() || "");
    const [budgetFood, setBudgetFood] = useState(campaign.budget_food?.toString() || "");
    const [budgetOther, setBudgetOther] = useState(campaign.budget_other_expense?.toString() || "");

    const [startDate, setStartDate] = useState<Date | undefined>(new Date(campaign.start_date));
    const [endDate, setEndDate] = useState<Date | undefined>(new Date(campaign.end_date));
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Fetch clients for the dropdown
        const fetchClients = async () => {
            const { data } = await supabase.from('clients').select('id, name').order('name');
            if (data) {
                setClients(data);
                if (campaign.client) {
                    const matchedClient = data.find(c => c.name === campaign.client);
                    if (matchedClient) {
                        setClient(matchedClient.id);
                    } else {
                        setClient("none");
                    }
                } else {
                    setClient("none");
                }
            }
        };
        if (open) {
            fetchClients();
            // Reset to current DB values in case they were modified elsewhere
            setName(campaign.name);
            setBudget(campaign.budget.toString());
            setStatus(campaign.status || "Active");
            setBudgetTravel(campaign.budget_travel?.toString() || "");
            setBudgetAcc(campaign.budget_accommodation?.toString() || "");
            setBudgetFood(campaign.budget_food?.toString() || "");
            setBudgetOther(campaign.budget_other_expense?.toString() || "");
            setStartDate(new Date(campaign.start_date));
            setEndDate(new Date(campaign.end_date));
        }
    }, [open, campaign]);

    const handleSave = async () => {
        setIsSubmitting(true);

        if (!name.trim()) {
            alert("Please enter a campaign name");
            setIsSubmitting(false);
            return;
        }

        const parseAmount = (val: string) => {
            if (!val) return 0;
            const clean = val.replace(/[^0-9.]/g, '');
            const parsed = parseFloat(clean);
            return isNaN(parsed) ? 0 : parsed;
        };

        const totalBudgetVal = parseAmount(budget);
        if (totalBudgetVal <= 0) {
            alert("Please enter a valid total budget amount");
            setIsSubmitting(false);
            return;
        }

        if (!startDate || !endDate) {
            alert("Please select both start and end dates");
            setIsSubmitting(false);
            return;
        }

        if (endDate < startDate) {
            alert("End date cannot be before start date");
            setIsSubmitting(false);
            return;
        }

        let clientName: string | null = null;
        if (client && client !== "none") {
            const c = clients.find(cl => cl.id === client);
            if (c) clientName = c.name;
        }

        const payload = {
            name: name.trim(),
            client: clientName,
            budget: totalBudgetVal,
            budget_travel: parseAmount(budgetTravel) || 0,
            budget_accommodation: parseAmount(budgetAcc) || 0,
            budget_food: parseAmount(budgetFood) || 0,
            budget_other_expense: parseAmount(budgetOther) || 0,
            start_date: format(startDate, 'yyyy-MM-dd'),
            end_date: format(endDate, 'yyyy-MM-dd'),
            status: status
        };

        try {
            const { error } = await supabase
                .from('campaigns')
                .update(payload)
                .eq('id', campaign.id);

            if (error) throw error;

            setOpen(false);
            onSuccess();
        } catch (err: any) {
            alert("Error updating: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-white/10 text-white bg-white/5 hover:bg-white/10 px-4 h-10 rounded-xl transition-all shadow-lg hover:shadow-white/5">
                    <Edit2 size={16} className="mr-2 text-zinc-400" /> Edit Campaign
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[600px] p-0 gap-0 outline-none w-[95vw] max-h-[90vh] overflow-y-auto custom-scrollbar">
                <DialogHeader className="p-4 pb-2 space-y-1">
                    <DialogTitle>Edit Campaign</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 px-6 py-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="grid gap-1.5">
                            <Label>Campaign Name *</Label>
                            <Input
                                className="bg-white/5 border-white/10 h-11 text-white focus-visible:ring-1 focus-visible:ring-orange-500/20"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-muted-foreground text-xs">Client (Optional)</Label>
                            <Select value={client} onValueChange={setClient}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-11 text-white w-full">
                                    <SelectValue placeholder="Select client" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white z-[200]">
                                    <SelectItem value="none">No Client / Internal</SelectItem>
                                    {clients.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="grid gap-1.5">
                            <Label>Total Budget *</Label>
                            <div className="relative">
                                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500" />
                                <Input
                                    className="bg-white/5 border-orange-500/30 pl-9 h-11 text-white focus-visible:ring-1 focus-visible:ring-orange-500/50 font-bold"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-11 text-white w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white z-[200]">
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Completed">Completed</SelectItem>
                                    <SelectItem value="Paused">Paused</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="grid gap-1.5">
                            <Label>Start Date *</Label>
                            <DatePicker
                                date={startDate}
                                setDate={setStartDate}
                                className="bg-white/5 border-white/10 h-11 text-white hover:bg-zinc-900 w-full justify-start text-left font-normal"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>End Date *</Label>
                            <DatePicker
                                date={endDate}
                                setDate={setEndDate}
                                className="bg-white/5 border-white/10 h-11 text-white hover:bg-zinc-900 w-full justify-start text-left font-normal"
                            />
                        </div>
                    </div>

                    <hr className="border-white/5" />

                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Allocate Budget (Optional)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="grid gap-1.5">
                            <Label className="text-blue-400">Travel Budget</Label>
                            <div className="relative">
                                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <Input
                                    className="bg-white/5 border-white/10 pl-9 h-11 text-white focus-visible:ring-1 focus-visible:ring-blue-500/30"
                                    value={budgetTravel}
                                    onChange={(e) => setBudgetTravel(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-purple-400">Accommodation Budget</Label>
                            <div className="relative">
                                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <Input
                                    className="bg-white/5 border-white/10 pl-9 h-11 text-white focus-visible:ring-1 focus-visible:ring-purple-500/30"
                                    value={budgetAcc}
                                    onChange={(e) => setBudgetAcc(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-amber-400">Food Budget</Label>
                            <div className="relative">
                                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <Input
                                    className="bg-white/5 border-white/10 pl-9 h-11 text-white focus-visible:ring-1 focus-visible:ring-amber-500/30"
                                    value={budgetFood}
                                    onChange={(e) => setBudgetFood(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-zinc-400">Other Expense Budget</Label>
                            <div className="relative">
                                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <Input
                                    className="bg-white/5 border-white/10 pl-9 h-11 text-white focus-visible:ring-1 focus-visible:ring-zinc-500/30"
                                    value={budgetOther}
                                    onChange={(e) => setBudgetOther(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end items-center px-6 py-5 border-t border-white/5 mt-2 gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        className="h-11 text-zinc-400 hover:text-white hover:bg-white/5 px-6 rounded-xl font-medium transition-colors w-full sm:w-auto justify-center"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/20 px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none w-full sm:w-auto"
                    >
                        {isSubmitting ? "Updating..." : "Save Changes"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
