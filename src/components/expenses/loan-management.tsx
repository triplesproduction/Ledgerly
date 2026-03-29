"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { Banknote, Plus, History, ArrowRightLeft, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";

interface LoanManagementProps {
  loans: any[];
  repayments: any[];
  onSuccess: () => void;
  isAddingLoan?: boolean;
  onAddingLoanChange?: (open: boolean) => void;
}

export function LoanManagement({ loans, repayments, onSuccess, isAddingLoan, onAddingLoanChange }: LoanManagementProps) {
  const [isRepayOpen, setIsRepayOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [loanForm, setLoanForm] = useState({
    source: "",
    amount: "",
    date: new Date(),
    notes: "",
  });

  const [repayForm, setRepayForm] = useState({
    amount: "",
    date: new Date(),
    notes: "",
  });

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.from("loans").insert({
        source: loanForm.source,
        amount_received: parseFloat(loanForm.amount),
        date: format(loanForm.date, "yyyy-MM-dd"),
        notes: loanForm.notes,
      });
      if (error) throw error;
      alert("Loan recorded successfully");
      onAddingLoanChange?.(false);
      setLoanForm({ source: "", amount: "", date: new Date(), notes: "" });
      onSuccess();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from("loan_repayments").insert({
        loan_id: selectedLoanId,
        amount_paid: parseFloat(repayForm.amount),
        date: format(repayForm.date, "yyyy-MM-dd"),
        notes: repayForm.notes,
      });
      if (error) throw error;
      alert("Repayment recorded successfully");
      setIsRepayOpen(false);
      setRepayForm({ amount: "", date: new Date(), notes: "" });
      onSuccess();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateOutstanding = (loan: any) => {
    const totalRepaid = repayments
      .filter((r) => r.loan_id === loan.id)
      .reduce((sum, r) => sum + Number(r.amount_paid), 0);
    return Number(loan.amount_received) - totalRepaid;
  };

  return (
    <div className="space-y-8">
      <Dialog open={isAddingLoan} onOpenChange={onAddingLoanChange}>
        <DialogContent className="bg-[#09090b] border-white/10 text-white sm:max-w-[480px] p-0 gap-0 outline-none rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)]">
          <div className="bg-gradient-to-r from-zinc-600/10 to-transparent border-b border-white/5 p-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-500/10 flex items-center justify-center text-zinc-400 shrink-0 border border-white/10">
              <Banknote size={24} />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">Record Borrowed Funds</DialogTitle>
              <p className="text-[10px] font-bold text-zinc-500 tracking-[0.05em] uppercase">External Capital Infusion</p>
            </DialogHeader>
          </div>
          <form onSubmit={handleAddLoan} className="p-7 space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="source" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Funding Source</Label>
              <Input
                id="source"
                placeholder="e.g. Personal Fund, HDFC Loan"
                value={loanForm.source}
                onChange={(e) => setLoanForm({ ...loanForm, source: e.target.value })}
                className="bg-white/[0.03] border-white/10 h-12 text-white rounded-2xl focus-visible:ring-1 focus-visible:ring-orange-500/30 px-5 text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label htmlFor="amount" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Principal Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={loanForm.amount}
                  onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })}
                  className="bg-white/[0.03] border-white/10 h-12 text-white rounded-2xl focus-visible:ring-1 focus-visible:ring-emerald-500/30 px-5 font-mono"
                  required
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="date" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Agreement Date</Label>
                <DatePicker
                  date={loanForm.date}
                  setDate={(d) => d && setLoanForm({ ...loanForm, date: d })}
                  className="bg-white/[0.03] border-white/10 h-12 text-white rounded-2xl px-5 hover:bg-white/[0.05]"
                />
              </div>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="notes" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Liability Notes</Label>
              <Textarea
                id="notes"
                placeholder="Terms, interest, or repayment plan..."
                value={loanForm.notes}
                onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value })}
                className="bg-white/[0.03] border-white/10 min-h-[100px] text-white rounded-2xl focus-visible:ring-1 focus-visible:ring-zinc-500/30 px-5 transition-all"
              />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <Button type="button" variant="ghost" onClick={() => onAddingLoanChange?.(false)} className="h-12 px-6 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-semibold active:scale-95 flex-1">
                Cancel
              </Button>
              <Button type="submit" className="h-12 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-bold px-10 shadow-xl shadow-orange-500/20 active:scale-[0.97] transition-all flex-[2]" disabled={isLoading}>
                {isLoading ? "Recording..." : "Record Loan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border border-white/5 p-6 rounded-2xl shadow-xl">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
            Total Borrowed
          </p>
          <p className="text-2xl font-bold text-white italic tracking-tight">
            ₹{loans.reduce((sum, l) => sum + Number(l.amount_received), 0).toLocaleString()}
          </p>
        </Card>
        <Card className="bg-card border border-white/5 p-6 rounded-2xl shadow-xl">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
            Total Repaid
          </p>
          <p className="text-2xl font-bold text-emerald-500 italic tracking-tight">
            ₹{repayments.reduce((sum, r) => sum + Number(r.amount_paid), 0).toLocaleString()}
          </p>
        </Card>
        <Card className="bg-card border border-white/5 p-6 rounded-2xl shadow-xl border-l-orange-500/50">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">
            Net Liability
          </p>
          <p className="text-2xl font-bold text-orange-500 italic tracking-tight">
            ₹{(loans.reduce((sum, l) => sum + Number(l.amount_received), 0) - repayments.reduce((sum, r) => sum + Number(r.amount_paid), 0)).toLocaleString()}
          </p>
        </Card>
      </div>

      <Card className="rounded-2xl border border-white/5 bg-card overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-12 pl-6">Source</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-12">Principal</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-12">Outstanding</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-12">Date</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-12 text-right pr-6">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-500 font-medium italic">
                  No loan records found.
                </TableCell>
              </TableRow>
            ) : (
              loans.map((loan) => {
                const outstanding = calculateOutstanding(loan);
                return (
                  <TableRow key={loan.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                    <TableCell className="pl-6 py-4">
                      <div className="text-sm font-semibold text-white">{loan.source}</div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="text-sm font-bold text-white/60 italic">₹{Number(loan.amount_received).toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className={`text-sm font-bold ${outstanding > 0 ? 'text-orange-500' : 'text-emerald-500'}`}>
                        {outstanding > 0 ? `₹${outstanding.toLocaleString()}` : 'Settled'}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-xs text-zinc-500">{format(new Date(loan.date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-right pr-6 py-4">
                      {outstanding > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 border-emerald-500/20 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg font-bold gap-2 transition-all px-4"
                          onClick={() => {
                            setSelectedLoanId(loan.id);
                            setIsRepayOpen(true);
                          }}
                        >
                          <TrendingUp size={14} /> Pay Back
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={isRepayOpen} onOpenChange={setIsRepayOpen}>
        <DialogContent className="bg-[#09090b] border-white/10 text-white sm:max-w-[480px] p-0 gap-0 outline-none rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)]">
          <div className="bg-gradient-to-r from-emerald-600/10 to-transparent border-b border-white/5 p-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 border border-emerald-500/20">
              <TrendingUp size={24} />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">Record Repayment</DialogTitle>
              <p className="text-[10px] font-bold text-zinc-500 tracking-[0.05em] uppercase">Liability Settlement</p>
            </DialogHeader>
          </div>
          <form onSubmit={handleAddRepayment} className="p-7 space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="repay_amount" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Repayment Amount (₹)</Label>
              <Input
                id="repay_amount"
                type="number"
                placeholder="0.00"
                value={repayForm.amount}
                onChange={(e) => setRepayForm({ ...repayForm, amount: e.target.value })}
                className="bg-white/[0.03] border-white/10 h-12 text-white rounded-2xl focus-visible:ring-1 focus-visible:ring-emerald-500/30 px-5 font-mono"
                required
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="repay_date" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Payment Date</Label>
              <DatePicker
                date={repayForm.date}
                setDate={(d) => d && setRepayForm({ ...repayForm, date: d })}
                className="bg-white/[0.03] border-white/10 h-12 text-white rounded-2xl px-5 hover:bg-white/[0.05]"
              />
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="repay_notes" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Transaction Notes</Label>
              <Textarea
                id="repay_notes"
                placeholder="Payment reference, mode, or notes..."
                value={repayForm.notes}
                onChange={(e) => setRepayForm({ ...repayForm, notes: e.target.value })}
                className="bg-white/[0.03] border-white/10 min-h-[100px] text-white rounded-2xl focus-visible:ring-1 focus-visible:ring-emerald-500/30 px-5 transition-all"
              />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsRepayOpen(false)} className="h-12 px-6 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-semibold active:scale-95 flex-1">
                Cancel
              </Button>
              <Button type="submit" className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold px-10 shadow-xl shadow-emerald-500/20 active:scale-[0.97] transition-all flex-[2]" disabled={isLoading}>
                {isLoading ? "Recording..." : "Confirm Repayment"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
