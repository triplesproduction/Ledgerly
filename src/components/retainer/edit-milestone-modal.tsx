"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";

export function EditMilestoneModal({
    milestone,
    isOpen,
    onClose,
    onSave
}: {
    milestone: any,
    isOpen: boolean,
    onClose: () => void,
    onSave: () => void
}) {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState("");
    const [status, setStatus] = useState("PENDING");

    useEffect(() => {
        if (milestone) {
            setAmount(milestone.amount?.toString() || "");
            setDate(milestone.date ? format(new Date(milestone.date), "yyyy-MM-dd") : "");
            setStatus(milestone.status || "PENDING");
        }
    }, [milestone]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const { error } = await supabase
                .from('income')
                .update({
                    amount: parseFloat(amount),
                    date: date,
                    expected_date: date,
                    status: status
                })
                .eq('id', milestone.id);

            if (error) throw error;
            onSave();
            onClose();
        } catch (err: any) {
            alert("Error updating milestone: " + err.message);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#0c0c0e] border-white/5 text-white max-w-sm rounded-3xl p-6 shadow-2xl">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-lg font-bold">Edit Milestone</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSave} className="space-y-5">
                    <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider ml-1">Amount</Label>
                        <div className="relative group">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 font-bold">₹</span>
                            <Input
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="bg-zinc-900/50 border-white/5 pl-9 h-12 rounded-xl focus:ring-orange-500/20 group-hover:border-white/10 transition-all font-mono text-lg"
                            />
                        </div>
                    </div>
                    
                    <div className="space-y-2 flex flex-col">
                        <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider ml-1">Expected Date</Label>
                        <DatePicker 
                            date={date ? new Date(date) : undefined}
                            setDate={(d) => setDate(d ? format(d, "yyyy-MM-dd") : "")}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs font-medium uppercase tracking-wider ml-1">Status</Label>
                        <select
                            className="w-full h-12 rounded-xl border border-white/5 bg-zinc-900/50 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 hover:border-white/10 transition-all appearance-none cursor-pointer"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="PENDING">Pending</option>
                            <option value="RECEIVED">Received / Paid</option>
                            <option value="OVERDUE">Overdue</option>
                        </select>
                    </div>

                    <DialogFooter className="pt-4 flex !justify-between gap-3">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-xl hover:bg-white/5 text-zinc-400">
                            Cancel
                        </Button>
                        <Button type="submit" className="flex-[2] bg-orange-500 hover:bg-orange-600 h-12 rounded-xl text-white font-bold shadow-lg shadow-orange-500/20">
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
