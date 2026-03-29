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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ShoppingBag, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface PurchasePlannerProps {
  plans: any[];
  onSuccess: () => void;
  onConvertToExpense: (item: any) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PurchasePlanner({ plans, onSuccess, onConvertToExpense, open, onOpenChange }: PurchasePlannerProps) {
  const [formData, setFormData] = useState({
    item_name: "",
    estimated_cost: "",
    priority: "Medium",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.from("purchase_plans").insert({
        item_name: formData.item_name,
        estimated_cost: parseFloat(formData.estimated_cost),
        priority: formData.priority,
        notes: formData.notes,
        status: "Planned",
      });

      if (error) throw error;

      alert("Purchase plan added");
      onOpenChange?.(false);
      setFormData({ item_name: "", estimated_cost: "", priority: "Medium", notes: "" });
      onSuccess();
    } catch (error: any) {
      alert(error.message || "Failed to add plan");
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("purchase_plans").update({ status }).eq("id", id);
      if (error) throw error;
      onSuccess();
    } catch (error: any) {
      alert("Failed to update status");
    }
  };

  const deletePlan = async (id: string) => {
    try {
      const { error } = await supabase.from("purchase_plans").delete().eq("id", id);
      if (error) throw error;
      alert("Plan removed");
      onSuccess();
    } catch (error: any) {
      alert("Failed to delete plan");
    }
  };

  return (
    <div className="space-y-6">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-[#09090b] border-white/10 text-white sm:max-w-[480px] p-0 gap-0 outline-none rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)]">
          <div className="bg-gradient-to-r from-orange-600/10 to-transparent border-b border-white/5 p-6 py-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0 border border-orange-500/20">
              <ShoppingBag size={24} />
            </div>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">Add Purchase Plan</DialogTitle>
              <p className="text-[10px] font-bold text-zinc-500 tracking-[0.05em] uppercase">Inventory & Asset Acquisition</p>
            </DialogHeader>
          </div>
          <form onSubmit={handleSubmit} className="p-7 space-y-6">
            <div className="space-y-2.5">
              <Label htmlFor="item_name" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Proposed Item Name</Label>
              <Input
                id="item_name"
                placeholder="e.g. Ergonomic Office Chairs"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                className="bg-white/[0.03] border-white/10 h-12 text-white rounded-2xl focus-visible:ring-1 focus-visible:ring-orange-500/30 px-5 text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label htmlFor="cost" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Estimated Cost (₹)</Label>
                <Input
                  id="cost"
                  type="number"
                  placeholder="0.00"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                  className="bg-white/[0.03] border-white/10 h-12 text-white rounded-2xl focus-visible:ring-1 focus-visible:ring-orange-500/30 px-5 font-mono"
                  required
                />
              </div>
              <div className="space-y-2.5">
                <Label htmlFor="priority" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Priority Level</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger className="bg-white/[0.03] border-white/10 h-12 text-white rounded-2xl px-5 hover:bg-white/[0.05]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121217] border-white/10 text-white shadow-2xl rounded-2xl">
                    <SelectItem value="High" className="focus:bg-rose-500/10 focus:text-rose-500">High</SelectItem>
                    <SelectItem value="Medium" className="focus:bg-orange-500/10 focus:text-orange-500">Medium</SelectItem>
                    <SelectItem value="Low" className="focus:bg-blue-500/10 focus:text-blue-500">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2.5">
              <Label htmlFor="notes" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Specifications or reason for purchase..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-white/[0.03] border-white/10 min-h-[100px] text-white rounded-2xl focus-visible:ring-1 focus-visible:ring-orange-500/30 px-5 transition-all"
              />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange?.(false)} className="h-12 px-6 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-semibold active:scale-95 flex-1">
                Cancel
              </Button>
              <Button type="submit" className="h-12 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-bold px-10 shadow-xl shadow-orange-500/20 active:scale-[0.97] transition-all flex-[2]" disabled={isLoading}>
                {isLoading ? "Saving..." : "Add to Planner"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="rounded-2xl border border-white/5 bg-card overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-12 pl-6">Item</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-12">Estimated Cost</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-12">Priority</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-12">Status</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-12 text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-500 font-medium italic">
                  No planned purchases found.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                  <TableCell className="pl-6 py-4">
                    <div className="text-sm font-semibold text-white">{plan.item_name}</div>
                    {plan.notes && <div className="text-[12px] text-zinc-500 mt-0.5 line-clamp-1 max-w-[200px]">{plan.notes}</div>}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="text-sm font-bold text-orange-500 italic">₹{Number(plan.estimated_cost).toLocaleString()}</div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold border tracking-tighter ${
                      plan.priority === 'High' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                      plan.priority === 'Medium' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                      'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                      {plan.priority}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <Select
                      value={plan.status}
                      onValueChange={(v) => updateStatus(plan.id, v)}
                    >
                      <SelectTrigger className="h-9 bg-zinc-900/50 border-white/10 text-[12px] font-medium w-[130px] text-white rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#16171D] border-white/10 text-white">
                        <SelectItem value="Planned">Planned</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Purchased">Purchased</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right pr-6 py-4">
                    <div className="flex justify-end gap-2">
                      {plan.status === 'Purchased' && (
                        <Button
                          size="sm"
                          className="h-9 bg-emerald-600 hover:bg-emerald-700 gap-2 text-[11px] font-bold px-4 rounded-lg shadow-lg shadow-emerald-500/10"
                          onClick={() => onConvertToExpense(plan)}
                        >
                          <CheckCircle2 size={14} /> Process
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg"
                        onClick={() => deletePlan(plan.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
