import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { Send, Reply, History, ArrowUpRight, ArrowDownRight, Wallet, IndianRupee, Pencil, Trash, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface FundsWithDadProps {
  balance: number;
  totalSent: number;
  totalSpent: number;
  transfers?: any[];
  onSuccess: () => void;
}

export function FundsWithDad({ balance, totalSent, totalSpent, transfers = [], onSuccess }: FundsWithDadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const [type, setType] = useState<"send" | "settle">("send");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editType, setEditType] = useState<"send" | "settle">("send");

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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this transfer? This will affect the 'Funds with Dad' balance.")) return;
    
    setIsLoading(true);
    const { error } = await supabase.from('fund_transfers').delete().eq('id', id);
    if (!error) {
        onSuccess();
    } else {
        alert("Error deleting transfer: " + error.message);
    }
    setIsLoading(false);
  };

  const handleEditClick = (tr: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(tr.id);
    setEditAmount(tr.amount.toString());
    setEditNote(tr.note || "");
    setEditType(tr.from_person === "You" ? "send" : "settle");
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setIsLoading(true);

    try {
        const { error } = await supabase
            .from('fund_transfers')
            .update({
                amount: parseFloat(editAmount),
                note: editNote,
                from_person: editType === "send" ? "You" : "Dad",
                to_person: editType === "send" ? "Dad" : "You"
            })
            .eq('id', editingId);

        if (error) throw error;
        setIsEditOpen(false);
        onSuccess();
    } catch (err: any) {
        alert("Update failed: " + err.message);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
    <Card className="rounded-2xl border border-white/5 bg-card p-6 shadow-2xl backdrop-blur-md relative overflow-hidden group">
      <div className="relative z-10 flex flex-col h-full space-y-6">
        {/* Header: Title & Balance */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium text-white tracking-tight">
                Funds with Dad
                </h3>
                <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                    <DialogTrigger asChild>
                        <button className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-500 hover:text-orange-500 transition-all active:scale-95 group/hist" title="View History">
                            <History size={16} className="group-hover/hist:rotate-[-45deg] transition-transform" />
                        </button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#09090b] border-white/10 text-white sm:max-w-[500px] p-0 gap-0 outline-none rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]">
                        <div className="bg-gradient-to-r from-orange-600/10 to-transparent border-b border-white/5 p-6 py-5 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                                <History size={20} />
                            </div>
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold tracking-tight text-white">Transfer History</DialogTitle>
                            </DialogHeader>
                        </div>
                        <div className="p-6 max-h-[450px] overflow-y-auto custom-scrollbar bg-black/40">
                            {transfers.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                                    <AlertCircle size={32} className="mb-2 opacity-20" />
                                    <p className="text-sm">No transfer history found.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {transfers.map((tr: any) => (
                                        <div key={tr.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl flex items-center justify-between group/item hover:bg-white/[0.05] hover:border-white/10 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover/item:scale-110",
                                                    tr.from_person === "You" ? "text-orange-500 bg-orange-500/10" : "text-blue-500 bg-blue-500/10"
                                                )}>
                                                    {tr.from_person === "You" ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-white tracking-tight">
                                                            {tr.from_person === "You" ? "Sent to Dad" : "Settle Back"}
                                                        </p>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-500 font-bold uppercase tracking-wider">
                                                            {format(new Date(tr.date), "dd MMM")}
                                                        </span>
                                                    </div>
                                                    {tr.note && (
                                                        <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1 italic font-medium">"{tr.note}"</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <p className={cn(
                                                    "text-sm font-black italic tracking-tight",
                                                    tr.from_person === "You" ? "text-white" : "text-blue-500"
                                                )}>
                                                    {tr.from_person === "You" ? "-" : "+"}₹{Number(tr.amount).toLocaleString()}
                                                </p>
                                                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                    <button onClick={(e) => handleEditClick(tr, e)} className="p-1 text-zinc-500 hover:text-white transition-colors">
                                                        <Pencil size={12} />
                                                    </button>
                                                    <button onClick={(e) => handleDelete(tr.id, e)} className="p-1 text-zinc-500 hover:text-rose-500 transition-colors">
                                                        <Trash size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
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
          <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 relative group/stat">
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
            <DialogContent className="bg-[#09090b] border-white/10 text-white sm:max-w-[425px] p-0 gap-0 outline-none rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]">
              <div className="bg-gradient-to-r from-orange-600/10 to-transparent border-b border-white/5 p-6 py-5">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase text-white">Send Money to Dad</DialogTitle>
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
              <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl h-11 gap-2 font-bold transition-all">
                <Reply size={14} /> Settle Back
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#09090b] border-white/10 text-white sm:max-w-[425px] p-0 gap-0 outline-none rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]">
              <div className="bg-gradient-to-r from-blue-600/10 to-transparent border-b border-white/5 p-6 py-5">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase text-white">Settle Balance from Dad</DialogTitle>
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
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]" disabled={isLoading}>
                  {isLoading ? "Recording..." : "Confirm Settlement"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Card>

    {/* Edit Dialog */}
    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#09090b] border-white/10 text-white sm:max-w-[425px] p-0 gap-0 outline-none rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]">
            <div className="bg-gradient-to-r from-zinc-600/10 to-transparent border-b border-white/5 p-6 py-5">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase text-white">Edit Transfer</DialogTitle>
                </DialogHeader>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-2 bg-white/5 p-1 rounded-xl">
                    <button 
                        type="button"
                        onClick={() => setEditType("send")}
                        className={cn("h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", editType === "send" ? "bg-orange-600 text-white shadow-lg shadow-orange-500/20" : "text-zinc-500 hover:text-white")}
                    >Sent to Dad</button>
                    <button 
                        type="button"
                        onClick={() => setEditType("settle")}
                        className={cn("h-8 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all", editType === "settle" ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-zinc-500 hover:text-white")}
                    >Settle Back</button>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Amount (₹)</Label>
                    <div className="relative">
                        <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <Input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="bg-white/5 border-white/10 pl-9 h-12 text-lg font-mono rounded-xl focus-visible:ring-1 focus-visible:ring-zinc-500/20"
                            required
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Note</Label>
                    <Textarea
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="bg-white/5 border-white/10 min-h-[100px] rounded-xl focus-visible:ring-1 focus-visible:ring-zinc-500/20 text-sm py-3"
                    />
                </div>
                <Button type="submit" className="w-full bg-white text-black hover:bg-zinc-200 h-12 font-bold rounded-xl transition-all active:scale-[0.98]" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Update Transfer"}
                </Button>
            </form>
        </DialogContent>
    </Dialog>
    </>
  );
}
