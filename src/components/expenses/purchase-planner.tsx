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
        <DialogContent className="bg-[#121214] border border-white/10 text-white sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Add to Purchase Planner</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label htmlFor="item_name" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Item Name</Label>
                <Input
                  id="item_name"
                  placeholder="e.g. Ergonomic Office Chairs"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  className="bg-zinc-900/50 border-white/10 h-11 focus-visible:ring-orange-500/20"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Estimated Cost (₹)</Label>
                  <Input
                    id="cost"
                    type="number"
                    placeholder="0.00"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                    className="bg-zinc-900/50 border-white/10 h-11 focus-visible:ring-orange-500/20 font-mono"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) => setFormData({ ...formData, priority: v })}
                  >
                    <SelectTrigger className="bg-zinc-900/50 border-white/10 h-11">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#16171D] border-white/10 text-white">
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="bg-zinc-900/50 border-white/10 min-h-[100px] focus-visible:ring-orange-500/20"
                />
              </div>
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 h-12 font-bold shadow-lg shadow-orange-500/20 rounded-xl" disabled={isLoading}>
                {isLoading ? "Saving..." : "Add to Planner"}
              </Button>
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
