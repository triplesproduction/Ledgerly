
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

interface AddExpenseDialogProps {
    categoryOptions: any[];
    paymentMethods: any[];
    onSuccess: () => void;
}

export function AddExpenseDialog({ categoryOptions, paymentMethods, onSuccess }: AddExpenseDialogProps) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        vendor: "",
        category: "variable",
        amount: "",
        date: new Date(),
        paymentMethod: "bank",
        status: "PAID"
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        setIsSubmitting(true);
        // Sanitize and validate amount
        const cleanAmount = formData.amount.replace(/[^0-9.]/g, '');
        const amountVal = parseFloat(cleanAmount);

        if (isNaN(amountVal) || amountVal <= 0) {
            alert("Please enter a valid amount");
            setIsSubmitting(false);
            return;
        }

        if (!formData.vendor.trim()) {
            alert("Please enter a merchant name");
            setIsSubmitting(false);
            return;
        }

        const payload = {
            date: format(formData.date, 'yyyy-MM-dd'),
            description: formData.vendor,
            vendor: formData.vendor,
            category: formData.category,
            amount: amountVal,
            payment_method: formData.paymentMethod,
            status: formData.status
        };

        try {
            const { error } = await supabase
                .from('expenses')
                .insert([payload]);

            if (error) throw error;

            setOpen(false);
            // Reset form
            setFormData({
                vendor: "",
                category: "variable",
                amount: "",
                date: new Date(),
                paymentMethod: "bank",
                status: "PAID"
            });
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
            <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[425px] p-0 gap-0 outline-none">
                <DialogHeader className="p-6 pb-2 space-y-1">
                    <DialogTitle>Record Expense</DialogTitle>
                </DialogHeader>
                <div className="grid gap-7 px-6 py-4">
                    <div className="grid gap-2">
                        <Label className="text-muted-foreground text-xs">Category</Label>
                        <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                            <SelectTrigger className="bg-white/5 border-white/10 h-11 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-white/10 text-white z-[200]">
                                {categoryOptions.map(opt => (
                                    <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="grid gap-2">
                            <Label>Amount</Label>
                            <div className="relative">
                                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <Input
                                    className="bg-white/5 border-white/10 pl-9 h-11 text-white focus-visible:ring-1 focus-visible:ring-orange-500/20"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Date</Label>
                            <DatePicker
                                date={formData.date}
                                setDate={(d) => d && setFormData({ ...formData, date: d })}
                                className="bg-white/5 border-white/10 h-11 text-white hover:bg-zinc-900 w-full justify-start text-left font-normal"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Merchant</Label>
                            <Input
                                className="bg-white/5 border-white/10 h-11 text-white focus-visible:ring-1 focus-visible:ring-orange-500/20"
                                value={formData.vendor}
                                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                                placeholder="E.g. AWS"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Payment Method</Label>
                            <Select value={formData.paymentMethod} onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-11 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white z-[200]">
                                    {paymentMethods.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end items-center px-6 py-5 border-t border-white/5 mt-6 gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => setOpen(false)}
                        className="h-11 text-zinc-400 hover:text-white hover:bg-white/5 px-6 rounded-xl font-medium transition-colors"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/20 px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {isSubmitting ? "Saving..." : "Save Expense"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
