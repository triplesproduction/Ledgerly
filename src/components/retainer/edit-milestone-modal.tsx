"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

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
    const [status, setStatus] = useState("EXPECTED");

    useEffect(() => {
        if (milestone) {
            setAmount(milestone.amount?.toString() || "");
            setDate(milestone.date ? format(new Date(milestone.date), "yyyy-MM-dd") : "");
            setStatus(milestone.status || "EXPECTED");
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
            <DialogContent className="bg-[#18181b] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle>Edit Payment Milestone</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSave} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Expected Date</Label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <select
                            className="w-full h-10 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="EXPECTED">Expected</option>
                            <option value="PENDING">Pending</option>
                            <option value="RECEIVED">Received / Paid</option>
                        </select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit" className="bg-orange-500 hover:bg-orange-600">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
