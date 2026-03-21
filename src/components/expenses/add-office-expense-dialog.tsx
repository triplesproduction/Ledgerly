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
import { Plus, IndianRupee, Trash2 } from "lucide-react";
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

  const handleSave = async () => {
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
        // Only update if it's an existing mapped expense (not a purchase plan conversion)
        const { error } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", initialData.id);
        if (error) throw error;
        alert("Office expense updated");
      } else {
        const { error } = await supabase.from("expenses").insert([payload]);
        if (error) throw error;
        alert("Office expense recorded");
      }
      handleOpenChange(false);
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
      onSuccess();
    } catch (err: any) {
      alert("Error saving: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsSubmitting(true);
    const slug = newCategoryName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    try {
      const { error } = await supabase.from('office_categories').insert([{ name: newCategoryName, slug }]);
      if (error) throw error;
      
      setFormData({ ...formData, category: slug });
      setIsAddingCategory(false);
      setNewCategoryName("");
      onSuccess(); // Refresh parent categories
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
      <DialogContent className="bg-[#121217] border-white/10 text-white sm:max-w-[480px] p-0 gap-0 outline-none rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)]">
        <div className="bg-orange-600/5 border-b border-white/5 p-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic tracking-tighter uppercase text-orange-500">
              {initialData?.id && !initialData.item_name ? "Edit Office Expense" : "Record Office Expense"}
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="grid gap-6 px-6 py-6">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Item Name</Label>
            <Input
              className="bg-white/5 border-white/10 h-11 text-white rounded-xl focus-visible:ring-orange-500/20"
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              placeholder="e.g. Office Chair"
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Amount</Label>
              <div className="relative">
                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  className="bg-white/5 border-white/10 pl-8 h-11 text-white rounded-xl focus-visible:ring-orange-500/20 font-mono"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  type="number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Date</Label>
              <DatePicker
                date={formData.date}
                setDate={(d) => d && setFormData({ ...formData, date: d })}
                className="bg-white/5 border-white/10 h-11 text-white w-full rounded-xl"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Paid By</Label>
              <Select value={formData.paidBy} onValueChange={(val) => setFormData({ ...formData, paidBy: val })}>
                <SelectTrigger className="bg-white/5 border-white/10 h-11 text-white rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#121217] border-white/10 text-white">
                  <SelectItem value="You">You</SelectItem>
                  <SelectItem value="Dad">Dad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Category</Label>
              {isAddingCategory ? (
                <div className="flex gap-2">
                  <Input 
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="bg-white/5 border-white/10 h-11"
                  />
                  <Button onClick={handleCreateCategory} className="bg-emerald-600 hover:bg-emerald-700 h-11 px-4 rounded-xl">Add</Button>
                  <Button variant="ghost" onClick={() => setIsAddingCategory(false)} className="h-11">Cancel</Button>
                </div>
              ) : (
                <Select value={formData.category} onValueChange={(val) => {
                  if (val === "ADD_NEW") {
                    setIsAddingCategory(true);
                  } else {
                    setFormData({ ...formData, category: val });
                  }
                }}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-11 text-white rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121217] border-white/10 text-white">
                    {categories.map(opt => (
                      <SelectItem key={opt.id} value={opt.slug}>{opt.name}</SelectItem>
                    ))}
                    <div className="h-px bg-white/5 my-1" />
                    <SelectItem value="ADD_NEW" className="text-orange-500 font-bold">+ Add Category</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Vendor</Label>
              <Input
                className="bg-white/5 border-white/10 h-11 text-white rounded-xl focus-visible:ring-orange-500/20"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder="Payee name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Method</Label>
              <Select value={formData.paymentMethod} onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}>
                <SelectTrigger className="bg-white/5 border-white/10 h-11 text-white rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#121217] border-white/10 text-white">
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Notes</Label>
            <Input
              className="bg-white/5 border-white/10 h-11 text-white rounded-xl focus-visible:ring-orange-500/20"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-center px-6 py-5 border-t border-white/5 mt-4 gap-4 bg-orange-600/5">
          {initialData?.id && !initialData.item_name ? (
            <Button
              variant="ghost"
              onClick={async () => {
                if (!confirm("Are you sure you want to delete this expense?")) return;
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
              className="h-11 text-red-500 hover:text-red-400 hover:bg-red-500/10 px-6 rounded-xl flex items-center gap-2 transition-colors w-full sm:w-auto font-bold"
            >
              <Trash2 size={16} /> Delete
            </Button>
          ) : (
            <div className="hidden sm:block"></div>
          )}

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="ghost" onClick={() => handleOpenChange(false)} className="h-11 text-zinc-400 hover:text-white hover:bg-white/5 px-6 rounded-xl font-medium transition-colors w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              className="h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-xl shadow-orange-500/10 transition-all uppercase tracking-widest text-xs px-8 w-full sm:w-auto"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : (initialData?.id && !initialData.item_name ? "Update Expense" : "Record Expense")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
