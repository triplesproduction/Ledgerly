"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, IndianRupee } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import type { CampaignExpenseCategory } from "@/types/general";

interface AddCampaignExpenseDialogProps {
    campaignId: string;
    onSuccess: () => void;
}

const CATEGORIES: { label: string; value: CampaignExpenseCategory }[] = [
    { label: 'Travel', value: 'Travel' },
    { label: 'Accommodation', value: 'Accommodation' },
    { label: 'Food', value: 'Food' },
    { label: 'Ad Spend', value: 'Ad Spend' }
];

export function AddCampaignExpenseDialog({ campaignId, onSuccess }: AddCampaignExpenseDialogProps) {
    const [open, setOpen] = useState(false);

    // Form state
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [category, setCategory] = useState<string>("Travel");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"Online" | "Cash">("Online");

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        setIsSubmitting(true);

        if (!date) {
            alert("Please select a date");
            setIsSubmitting(false);
            return;
        }

        const cleanAmount = amount.replace(/[^0-9.]/g, '');
        const amountVal = parseFloat(cleanAmount);
        if (isNaN(amountVal) || amountVal <= 0) {
            alert("Please enter a valid expense amount");
            setIsSubmitting(false);
            return;
        }

        if (!description.trim()) {
            alert("Please enter a description for the expense");
            setIsSubmitting(false);
            return;
        }

        const payload = {
            campaign_id: campaignId,
            date: format(date, 'yyyy-MM-dd'),
            category,
            description: description.trim(),
            amount: amountVal,
            payment_method: paymentMethod
        };

        try {
            const { error } = await supabase
                .from('campaign_expenses')
                .insert([payload]);

            if (error) throw error;

            setOpen(false);
            // Reset form
            setDate(new Date());
            setCategory("Travel");
            setDescription("");
            setAmount("");
            setPaymentMethod("Online");

            onSuccess();
        } catch (err: any) {
            alert("Error saving: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 px-6 font-semibold">
                    <Plus size={18} className="mr-2" /> Add Expense
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[425px] p-0 gap-0 outline-none w-[95vw] max-h-[90vh] overflow-y-auto custom-scrollbar">
                <DialogHeader className="p-4 pb-2 space-y-1">
                    <DialogTitle>Add Campaign Expense</DialogTitle>
                </DialogHeader>
                <div className="grid gap-7 px-6 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="grid gap-1.5">
                            <Label>Date</Label>
                            <DatePicker
                                date={date}
                                setDate={setDate}
                                className="bg-white/5 border-white/10 h-11 text-white hover:bg-zinc-900 w-full justify-start text-left font-normal"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-11 text-white w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white z-[200]">
                                    {CATEGORIES.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label>Description</Label>
                        <Input
                            className="bg-white/5 border-white/10 h-11 text-white focus-visible:ring-1 focus-visible:ring-orange-500/20"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g. Pune to Mumbai flight"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="grid gap-1.5">
                            <Label>Amount (₹)</Label>
                            <div className="relative">
                                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <Input
                                    className="bg-white/5 border-white/10 pl-9 h-11 text-white focus-visible:ring-1 focus-visible:ring-orange-500/20"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="1500"
                                />
                            </div>
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Payment Method</Label>
                            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "Online" | "Cash")}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-11 text-white w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white z-[200]">
                                    <SelectItem value="Online">💳 Online</SelectItem>
                                    <SelectItem value="Cash">💵 Cash</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end items-center px-6 py-5 border-t border-white/5 mt-6 gap-3">
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
                        {isSubmitting ? "Saving..." : "Save Expense"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
