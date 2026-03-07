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

const OFFICE_CATEGORIES = [
    { value: "office_setup", label: "Office Setup" },
    { value: "office_supplies", label: "Office Supplies" },
    { value: "utilities", label: "Utilities" },
    { value: "maintenance", label: "Maintenance" },
    { value: "furniture", label: "Furniture" },
    { value: "equipment", label: "Equipment" },
    { value: "other", label: "Other" },
];

interface AddOfficeExpenseDialogProps {
    paymentMethods: any[];
    onSuccess: () => void;
}

export function AddOfficeExpenseDialog({ paymentMethods, onSuccess }: AddOfficeExpenseDialogProps) {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({
        item: "",
        category: "office_supplies",
        amount: "",
        date: new Date(),
        paidTo: "",
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

        if (!formData.item.trim()) {
            alert("Please enter an item name");
            setIsSubmitting(false);
            return;
        }

        if (!formData.paidTo.trim()) {
            alert("Please enter who was paid (Paid To)");
            setIsSubmitting(false);
            return;
        }

        const payload = {
            date: format(formData.date, 'yyyy-MM-dd'),
            description: formData.item,
            vendor: formData.paidTo,
            category: formData.category,
            amount: amountVal,
            payment_method: formData.paymentMethod,
            status: formData.status,
            expense_type: "office"
        };

        try {
            const { error } = await supabase
                .from('expenses')
                .insert([payload]);

            if (error) throw error;

            setOpen(false);
            // Reset form
            setFormData({
                item: "",
                category: "office_supplies",
                amount: "",
                date: new Date(),
                paidTo: "",
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
                    <Plus size={18} className="mr-2" /> Add Office Expense
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[425px] p-0 gap-0 outline-none w-[95vw] max-h-[90vh] overflow-y-auto custom-scrollbar">
                <DialogHeader className="p-4 pb-2 space-y-1">
                    <DialogTitle>Record Office Expense</DialogTitle>
                </DialogHeader>
                <div className="grid gap-7 px-6 py-4">
                    <div className="grid gap-1.5">
                        <Label className="text-muted-foreground text-xs">Item Name</Label>
                        <Input
                            className="bg-white/5 border-white/10 h-11 text-white focus-visible:ring-1 focus-visible:ring-orange-500/20"
                            value={formData.item}
                            onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                            placeholder="e.g. Office Chair"
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-muted-foreground text-xs">Expense Category</Label>
                        <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                            <SelectTrigger className="bg-white/5 border-white/10 h-11 text-white w-full">
                                <div className="grid grid-cols-[1fr] text-left">
                                    <span className="truncate">
                                        <SelectValue />
                                    </span>
                                </div>
                            </SelectTrigger>
                            <SelectContent className="bg-card border-white/10 text-white z-[200]">
                                {OFFICE_CATEGORIES.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="grid gap-1.5">
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
                        <div className="grid gap-1.5">
                            <Label>Date</Label>
                            <DatePicker
                                date={formData.date}
                                setDate={(d) => d && setFormData({ ...formData, date: d })}
                                className="bg-white/5 border-white/10 h-11 text-white hover:bg-zinc-900 w-full justify-start text-left font-normal"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                            <Label>Paid To</Label>
                            <Input
                                className="bg-white/5 border-white/10 h-11 text-white focus-visible:ring-1 focus-visible:ring-orange-500/20"
                                value={formData.paidTo}
                                onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                                placeholder="E.g. Avi Kaka"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>Payment Method</Label>
                            <Select value={formData.paymentMethod} onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-11 text-white w-full">
                                    <div className="grid grid-cols-[1fr] text-left">
                                        <span className="truncate">
                                            <SelectValue />
                                        </span>
                                    </div>
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
