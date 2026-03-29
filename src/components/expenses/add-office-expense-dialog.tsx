"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, IndianRupee, Trash2, Building2 } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface AddOfficeExpenseDialogProps {
  paymentMethods: any[];
  categories: Category[];
  onSuccess: () => void;
  initialData?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddOfficeExpenseDialog({
  paymentMethods,
  categories,
  onSuccess,
  initialData,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: AddOfficeExpenseDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    externalOnOpenChange?.(newOpen);
  };

  const [formData, setFormData] = useState({
    item: initialData?.description || initialData?.item_name || "",
    category: initialData?.category || "office_supplies",
    amount: (initialData?.amount || initialData?.estimated_cost)?.toString() || "",
    date: initialData?.date ? new Date(initialData.date) : new Date(),
    vendor: initialData?.vendor || "",
    paymentMethod: initialData?.payment_method || "Cash",
    paidBy: initialData?.paid_by || "You",
    notes: initialData?.notes || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({
        item: initialData.description || initialData.item_name || "",
        category: initialData.category || "office_supplies",
        amount: (initialData.amount || initialData.estimated_cost)?.toString() || "",
        date: initialData.date ? new Date(initialData.date) : new Date(),
        vendor: initialData.vendor || "",
        paymentMethod: initialData.payment_method || "Cash",
        paidBy: (initialData.expense_type === 'office_dad' || initialData.paid_by === 'Dad') ? 'Dad' : 'You',
        notes: "",
      });
    } else {
        setFormData({
            item: "",
            category: "office_supplies",
            amount: "",
            date: new Date(),
            vendor: "",
            paymentMethod: "Cash",
            paidBy: "You",
            notes: "",
        });
    }
    setIsAddingCategory(false);
    setNewCategoryName("");
  }, [initialData, open]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    const amountVal = parseFloat(formData.amount);

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

    const payload = {
      date: format(formData.date, "yyyy-MM-dd"),
      description: formData.notes ? `${formData.item} - ${formData.notes}` : formData.item,
      vendor: formData.vendor,
      category: formData.category,
      amount: amountVal,
      payment_method: formData.paymentMethod,
      expense_type: formData.paidBy === 'Dad' ? 'office_dad' : 'office_you',
      status: 'PAID'
    };

    try {
      if (initialData?.id && !initialData.item_name) {
        const { error } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert([payload]);
        if (error) throw error;
      }
      handleOpenChange(false);
      onSuccess();
    } catch (err: any) {
      alert("Error saving: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!newCategoryName.trim()) return;
    setIsSubmitting(true);
    const slug = newCategoryName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    try {
      const { error } = await supabase.from('office_categories').insert([{ name: newCategoryName, slug }]);
      if (error) throw error;
      
      setFormData({ ...formData, category: slug });
      setIsAddingCategory(false);
      setNewCategoryName("");
      onSuccess();
    } catch (err: any) {
      alert("Error adding category: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!externalOpen && (
        <DialogTrigger asChild>
          <Button className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 px-6 font-semibold h-11">
            <Plus size={18} className="mr-2" /> Add Office Expense
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="bg-[#09090b] border-white/10 text-white sm:max-w-[500px] p-0 gap-0 outline-none rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)]">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-orange-600/10 to-transparent border-b border-white/5 p-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0 border border-orange-500/20 shadow-lg shadow-orange-500/5">
            <Building2 size={24} />
          </div>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight text-white">
              {initialData?.id && !initialData.item_name ? "Edit Office Expense" : "Record Office Expense"}
            </DialogTitle>
            <p className="text-[10px] font-bold text-zinc-500 tracking-[0.05em] uppercase">Documenting Internal Agency Outflow</p>
          </DialogHeader>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex flex-col">
          <div className="p-7 space-y-7 max-h-[65vh] overflow-y-auto custom-scrollbar">
            {/* Row 1: Item Name */}
            <div className="space-y-2.5">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Purchased Item / Service</Label>
              <Input
                className="bg-white/[0.03] border-white/10 h-12 text-white rounded-2xl focus-visible:ring-1 focus-visible:ring-orange-500/30 transition-all px-5 text-sm placeholder:text-zinc-600 focus:bg-white/[0.05]"
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                placeholder="e.g. Ergonomic Office Chair"
                required
              />
            </div>

            {/* Row 2: Amount & Date */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Total Amount</Label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-orange-500 transition-colors">
                    <IndianRupee size={15} />
                  </div>
                  <Input
                    className="bg-white/[0.03] border-white/10 pl-10 h-12 text-white rounded-2xl focus-visible:ring-1 focus-visible:ring-orange-500/30 transition-all font-mono text-base focus:bg-white/[0.05]"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Incurred Date</Label>
                <DatePicker
                  date={formData.date}
                  setDate={(d) => d && setFormData({ ...formData, date: d })}
                  className="bg-white/[0.03] border-white/10 h-12 text-white w-full rounded-2xl hover:bg-white/[0.08] transition-all px-5"
                />
              </div>
            </div>
            
            {/* Row 3: Paid By & Category */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Payment Responsibility</Label>
                <Select value={formData.paidBy} onValueChange={(val) => setFormData({ ...formData, paidBy: val })}>
                  <SelectTrigger className="bg-white/[0.03] border-white/10 h-12 text-white rounded-2xl px-5 focus:ring-1 focus:ring-orange-500/30 transition-all hover:bg-white/[0.05]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121217] border-white/10 text-white shadow-2xl rounded-2xl">
                    <SelectItem value="You" className="focus:bg-orange-500/10 focus:text-orange-500 py-3 rounded-xl transition-colors">Paid by You</SelectItem>
                    <SelectItem value="Dad" className="focus:bg-orange-500/10 focus:text-orange-500 py-3 rounded-xl transition-colors">Paid by Dad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Expense Category</Label>
                {isAddingCategory ? (
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Category Name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="bg-white/[0.03] border-white/10 h-12 px-5 rounded-2xl flex-1 text-sm focus:ring-1 focus:ring-orange-500/30"
                      autoFocus
                    />
                    <Button type="button" onClick={handleCreateCategory} className="h-12 w-12 bg-orange-600 hover:bg-orange-700 rounded-2xl shrink-0 shadow-lg shadow-orange-500/20">
                      <Plus size={18} />
                    </Button>
                  </div>
                ) : (
                  <Select value={formData.category} onValueChange={(val) => {
                    if (val === "ADD_NEW") setIsAddingCategory(true);
                    else setFormData({ ...formData, category: val });
                  }}>
                    <SelectTrigger className="bg-white/[0.03] border-white/10 h-12 text-white rounded-2xl px-5 hover:bg-white/[0.05] transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#121217] border-white/10 text-white shadow-2xl rounded-2xl max-h-[250px] custom-scrollbar">
                      {categories.map(opt => (
                        <SelectItem key={opt.id} value={opt.slug} className="focus:bg-orange-500/10 focus:text-orange-500 py-3 rounded-xl transition-colors">{opt.name}</SelectItem>
                      ))}
                      <div className="h-px bg-white/5 my-1.5" />
                      <SelectItem value="ADD_NEW" className="text-orange-500 font-bold focus:bg-orange-500/10 py-3 rounded-xl">+ Create New</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Row 4: Vendor & Method */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2.5">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Vendor / Provider</Label>
                <Input
                  className="bg-white/[0.03] border-white/10 h-12 text-white rounded-2xl focus-visible:ring-1 focus-visible:ring-orange-500/30 transition-all px-5 text-sm placeholder:text-zinc-600 focus:bg-white/[0.05]"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="e.g. Amazon / local store"
                />
              </div>
              <div className="space-y-2.5">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Payment Method</Label>
                <Select value={formData.paymentMethod} onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}>
                  <SelectTrigger className="bg-white/[0.03] border-white/10 h-12 text-white rounded-2xl px-5 hover:bg-white/[0.05] transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121217] border-white/10 text-white shadow-2xl rounded-2xl">
                    <SelectItem value="Cash" className="focus:bg-orange-500/10 py-3">Cash</SelectItem>
                    <SelectItem value="UPI" className="focus:bg-orange-500/10 py-3">UPI</SelectItem>
                    <SelectItem value="Bank Transfer" className="focus:bg-orange-500/10 py-3">Bank Transfer</SelectItem>
                    <SelectItem value="Credit Card" className="focus:bg-orange-500/10 py-3">Credit Card</SelectItem>
                    <SelectItem value="Cheque" className="focus:bg-orange-500/10 py-3">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 5: Notes */}
            <div className="space-y-2.5">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 ml-1">Additional Context (Optional)</Label>
              <Input
                className="bg-white/[0.03] border-white/10 h-12 text-white rounded-2xl focus-visible:ring-1 focus-visible:ring-orange-500/30 transition-all px-5 text-sm placeholder:text-zinc-600 focus:bg-white/[0.05]"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Brief justification or details..."
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-8 py-6 border-t border-white/5 bg-white/[0.01] flex items-center justify-between gap-4 mt-auto">
            {initialData?.id && !initialData.item_name ? (
              <Button
                type="button"
                variant="ghost"
                onClick={async (e) => {
                  e.preventDefault();
                  if (!confirm("Confirm permanent deletion of this record?")) return;
                  setIsSubmitting(true);
                  try {
                    const { error } = await supabase.from("expenses").delete().eq("id", initialData.id);
                    if (error) throw error;
                    handleOpenChange(false);
                    onSuccess();
                  } catch (err: any) {
                    alert("Error deleting: " + err.message);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="h-12 px-6 rounded-2xl text-rose-500 hover:text-white hover:bg-rose-600 transition-all font-bold gap-2 active:scale-95"
              >
                <Trash2 size={16} /> Delete Entry
              </Button>
            ) : (
              <div className="hidden sm:block"></div>
            )}

            <div className="flex items-center gap-4 flex-1 sm:flex-initial">
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} className="h-12 px-8 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-semibold active:scale-95">
                Cancel
              </Button>
              <Button 
                type="submit"
                className="h-12 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:opacity-90 rounded-2xl font-bold px-10 shadow-xl shadow-orange-500/20 transition-all active:scale-[0.97] tracking-tight"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : (initialData?.id && !initialData.item_name ? "Update Expense" : "Save Expense")}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
