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
import { supabase } from "@/lib/supabase";
import { Send, Reply, History, ArrowUpRight, ArrowDownRight, Wallet, IndianRupee } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface FundsWithDadProps {
  balance: number;
  totalSent: number;
  totalSpent: number;
  onSuccess: () => void;
}

export function FundsWithDad({ balance, totalSent, totalSpent, onSuccess }: FundsWithDadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"send" | "settle">("send");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.from("fund_transfers").insert({
        from_person: type === "send" ? "You" : "Dad",
        to_person: type === "send" ? "Dad" : "You",
        amount: parseFloat(amount),
        note: note,
        date: format(new Date(), "yyyy-MM-dd"),
      });

      if (error) throw error;

      alert(type === "send" ? "Funds sent to Dad" : "Balance settled from Dad");
      setIsOpen(false);
      setAmount("");
      setNote("");
      onSuccess();
    } catch (error: any) {
      alert(error.message || "Failed to record transfer");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-white/5 bg-card p-6 shadow-2xl backdrop-blur-md relative overflow-hidden group">
      <div className="relative z-10 flex flex-col h-full space-y-6">
        {/* Header: Title & Balance */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-white tracking-tight">
              Funds with Dad
            </h3>
            <p className="text-sm text-zinc-500 font-medium leading-relaxed max-w-[240px]">
              Managing delegated cash and internal agency flow.
            </p>
          </div>
          <div className="sm:text-right flex flex-col sm:items-end">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">
              Current Balance
            </span>
            <div className={`text-2xl font-bold italic tracking-tighter ${balance >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                ₹{Math.abs(balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Sent</p>
            <p className="text-lg font-bold text-white italic">₹{totalSent.toLocaleString()}</p>
          </div>
          <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Spent</p>
            <p className="text-lg font-bold text-white italic">₹{totalSpent.toLocaleString()}</p>
          </div>
        </div>

        {/* Actions Row */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Dialog open={isOpen && type === "send"} onOpenChange={(open) => { setIsOpen(open); setType("send"); }}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-11 gap-2 font-bold shadow-lg shadow-orange-500/20">
                <Send size={14} /> Send Money
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#121217] border-white/10 text-white sm:max-w-[425px] p-0 gap-0 outline-none rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]">
              <div className="bg-orange-600/5 border-b border-white/5 p-6 py-5">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-orange-500">Send Money to Dad</DialogTitle>
                </DialogHeader>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6 p-6">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Amount (₹)</Label>
                  <div className="relative">
                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-white/5 border-white/10 pl-9 h-12 text-lg font-mono rounded-xl focus-visible:ring-1 focus-visible:ring-orange-500/20"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Note</Label>
                  <Textarea
                    id="note"
                    placeholder="e.g. For monthly groceries/office setup"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="bg-white/5 border-white/10 min-h-[100px] rounded-xl focus-visible:ring-1 focus-visible:ring-orange-500/20 text-sm py-3"
                  />
                </div>
                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 h-12 font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]" disabled={isLoading}>
                  {isLoading ? "Recording..." : "Confirm Transfer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isOpen && type === "settle"} onOpenChange={(open) => { setIsOpen(open); setType("settle"); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl h-11 gap-2 font-bold">
                <Reply size={14} /> Settle Back
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#121217] border-white/10 text-white sm:max-w-[425px] p-0 gap-0 outline-none rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]">
              <div className="bg-orange-600/5 border-b border-white/5 p-6 py-5">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-orange-500">Settle Balance from Dad</DialogTitle>
                </DialogHeader>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6 p-6">
                <div className="space-y-2">
                  <Label htmlFor="amount_settle" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Amount Received (₹)</Label>
                  <div className="relative">
                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <Input
                      id="amount_settle"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-white/5 border-white/10 pl-9 h-12 text-lg font-mono rounded-xl focus-visible:ring-1 focus-visible:ring-orange-500/20"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note_settle" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Note</Label>
                  <Textarea
                    id="note_settle"
                    placeholder="e.g. Return of unused cash"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="bg-white/5 border-white/10 min-h-[100px] rounded-xl focus-visible:ring-1 focus-visible:ring-orange-500/20 text-sm py-3"
                  />
                </div>
                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 h-12 font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]" disabled={isLoading}>
                  {isLoading ? "Recording..." : "Confirm Settlement"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>
  );
}
