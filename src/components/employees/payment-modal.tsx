"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { Loader2, DollarSign } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

interface Employee {
    id: string;
    name: string;
    salary: number;
    advanceTaken: number;
}

interface PaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    onSuccess: () => void;
}

export function PaymentModal({ open, onOpenChange, employee, onSuccess }: PaymentModalProps) {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [type, setType] = useState("salary");
    const [method, setMethod] = useState("bank");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open && employee) {
            if (type === 'salary') {
                const monthly = employee.salary / 12;
                setAmount(Math.round(monthly).toString());
            } else {
                setAmount("");
            }
        }
    }, [open, employee, type]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!employee) return;
        setIsLoading(true);

        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            alert("Please enter a valid amount");
            setIsLoading(false);
            return;
        }

        try {
            const { error: expenseError } = await supabase.from('expenses').insert({
                date: date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                amount: amountNum,
                category: "Payroll",
                vendor: employee.name,
                description: `${type === 'salary' ? 'Monthly Salary' : type === 'advance' ? 'Salary Advance' : 'Bonus'} Payment`,
                payment_method: method,
                status: "PAID"
            });

            if (expenseError) throw expenseError;

            const { data: currEmp, error: fetchError } = await supabase
                .from('employees')
                .select('total_paid, advance_taken')
                .eq('id', employee.id)
                .single();

            if (fetchError) throw fetchError;

            let newTotalPaid = (currEmp.total_paid || 0) + amountNum;
            let newAdvanceTaken = currEmp.advance_taken || 0;

            if (type === 'advance') {
                newAdvanceTaken += amountNum;
            }

            const { error: updateError } = await supabase
                .from('employees')
                .update({
                    total_paid: newTotalPaid,
                    advance_taken: newAdvanceTaken
                })
                .eq('id', employee.id);

            if (updateError) throw updateError;

            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!employee) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#121214] border-white/10 text-foreground sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Process Payment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-5 py-2">

                    {/* Employee Info */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/5 flex items-center justify-between">
                        <span className="text-xs text-zinc-400 uppercase tracking-wider font-bold">Payee</span>
                        <span className="text-sm font-bold text-white">{employee.name}</span>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label className="text-xs uppercase tracking-wider text-zinc-500">Payment Type</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="bg-white/5 border-white/10 text-white h-10"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-[#16171D] border-white/10 text-white">
                                    <SelectItem value="salary">Salary</SelectItem>
                                    <SelectItem value="advance">Advance</SelectItem>
                                    <SelectItem value="bonus">Bonus</SelectItem>
                                    <SelectItem value="reimbursement">Reimbursement</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2 relative">
                            <Label className="text-xs uppercase tracking-wider text-zinc-500">Payment Date</Label>
                            <div className="relative z-50">
                                <DatePicker date={date} setDate={setDate} className="w-full h-10" />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-xs uppercase tracking-wider text-zinc-500">Amount</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
                            <Input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="bg-black/20 border-white/10 text-lg font-bold pl-10 h-10" // Matching dashboard input style
                                placeholder="0.00"
                                required
                            />
                        </div>
                        {type === 'salary' && (
                            <p className="text-[10px] text-zinc-500 flex justify-end">
                                Monthly Base: ₹{(employee.salary / 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-xs uppercase tracking-wider text-zinc-500">Method</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white h-10"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#16171D] border-white/10 text-white">
                                <SelectItem value="bank">Bank Transfer</SelectItem>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="upi">UPI</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="mt-2">
                        <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-10 shadow-lg shadow-emerald-900/20" disabled={isLoading}>
                            {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                            Confirm Transfer
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
