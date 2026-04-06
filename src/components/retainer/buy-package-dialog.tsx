"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, Calendar, Package, Zap } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { supabase } from "@/lib/supabase";
import { RetainerContract, ContractVersion } from "@/types/retainer";
import { cn } from "@/lib/utils";

interface BuyPackageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contract: RetainerContract;
  currentVersion: ContractVersion | null;
  onSuccess: () => void;
}

export function BuyPackageDialog({ isOpen, onClose, contract, currentVersion, onSuccess }: BuyPackageDialogProps) {
  const [months, setMonths] = useState("3");
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [packageStartMonth, setPackageStartMonth] = useState<Date>(startOfMonth(new Date()));
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<{ label: string, value: string }[]>([]);

  // Calculate default price based on current version
  useEffect(() => {
    if (currentVersion && months) {
      const standardTotal = currentVersion.monthly_price * parseInt(months);
      // Default to standard price initially
      setTotalAmount(standardTotal.toString());
    }
  }, [currentVersion, months, isOpen]);

  // Fetch payment methods
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      const { data } = await supabase.from('app_options').select('label, value').eq('group_name', 'payment_mode');
      if (data && data.length > 0) {
        setPaymentMethods(data);
      } else {
        setPaymentMethods([
          { label: 'Bank Transfer', value: 'bank' },
          { label: 'UPI', value: 'upi' },
          { label: 'Cash', value: 'cash' }
        ]);
      }
    };
    fetchPaymentMethods();
  }, []);

  // Fetch next available month for the package default start
  useEffect(() => {
    const fetchNextMonth = async () => {
      if (!isOpen) return;
      const { data: versions } = await supabase.from('contract_versions').select('id').eq('contract_id', contract.id);
      if (!versions || versions.length === 0) return;

      const { data: lastInst } = await supabase
        .from('monthly_instances')
        .select('month_date')
        .in('contract_version_id', versions.map(v => v.id))
        .order('month_date', { ascending: false })
        .limit(1)
        .single();

      if (lastInst) {
        setPackageStartMonth(addMonths(new Date(lastInst.month_date), 1));
      } else {
        setPackageStartMonth(new Date());
      }
    };
    fetchNextMonth();
  }, [isOpen, contract.id]);

  const handleConfirm = async () => {
    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!currentVersion) {
      alert("No active contract version found. Please ensure the contract has a valid active price.");
      return;
    }

    setIsLoading(true);
    try {
      const numMonths = parseInt(months);
      const bulkTotal = parseFloat(totalAmount);
      const monthlyRate = bulkTotal / numMonths;

      const startMonth = packageStartMonth;
      const monthDates = Array.from({ length: numMonths }, (_, i) => format(addMonths(startMonth, i), 'yyyy-MM-dd'));

      // 1. Check for existing instances in these months across ALL versions of this contract
      const { data: versions } = await supabase.from('contract_versions').select('id').eq('contract_id', contract.id);
      const versionIds = versions?.map(v => v.id) || [];

      const { data: existingInstances } = await supabase
        .from('monthly_instances')
        .select('*')
        .in('contract_version_id', versionIds)
        .gte('month_date', format(startOfMonth(startMonth), 'yyyy-MM-dd'))
        .lte('month_date', format(endOfMonth(addMonths(startMonth, numMonths - 1)), 'yyyy-MM-dd'));

      // 2. Prepare Updates and Inserts without changing versions or price 
      // Rule: Always use original price unless explicitly updated.
      const instancesToUpdate: any[] = [];
      const instancesToInsert: any[] = [];

      for (const mDateStr of monthDates) {
        const targetDate = new Date(mDateStr);
        const startOfM = format(startOfMonth(targetDate), 'yyyy-MM-dd');
        const endOfM = format(endOfMonth(targetDate), 'yyyy-MM-dd');

        // Check if ANY instance exists within this month boundary (even if anchored on the 1st)
        const existingInMonth = (existingInstances || []).find((inst: any) =>
          inst.month_date >= startOfM && inst.month_date <= endOfM
        );

        if (existingInMonth) {
          // Update existing and snap its date to the chosen cycle day!
          instancesToUpdate.push({ id: existingInMonth.id, month_date: mDateStr });
        } else {
          // Create new cleanly mapped to the CURRENT version with original price
          instancesToInsert.push({
            contract_version_id: currentVersion.id,
            month_date: mDateStr,
            total_due: currentVersion.monthly_price,
            status: 'paid'
          });
        }
      }

      // 3. Execute DB Operations
      let finalInstanceIds: string[] = [];

      for (const updateObj of instancesToUpdate) {
        const { error: updateError } = await supabase
          .from('monthly_instances')
          .update({ status: 'paid', month_date: updateObj.month_date })
          .eq('id', updateObj.id);
        if (updateError) throw updateError;
        finalInstanceIds.push(updateObj.id);
      }

      if (instancesToInsert.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from('monthly_instances')
          .insert(instancesToInsert)
          .select();
        if (insertError) throw insertError;
        if (inserted) {
          finalInstanceIds.push(...inserted.map(i => i.id));
        }
      }

      // 4. Cleanup old auto-generated unpaid debt (Pending/Overdue/Expected) for these overtaken instances
      if (finalInstanceIds.length > 0) {
        // A. Delete specifically linked milestones (even EXPECTED ones)
        await supabase.from('income').delete().in('retainer_instance_id', finalInstanceIds).in('status', ['PENDING', 'OVERDUE', 'EXPECTED']);

        // B. Cleanup orphans for this client/service in these months (safety for unlinked entries)
        const startRange = format(startOfMonth(startMonth), 'yyyy-MM-dd');
        const endRange = format(endOfMonth(addMonths(startMonth, numMonths - 1)), 'yyyy-MM-dd');

        await supabase.from('income')
          .delete()
          .eq('client_id', contract.client_id)
          .eq('service_id', contract.service_id)
          .gte('date', startRange)
          .lte('date', endRange)
          .in('status', ['PENDING', 'OVERDUE', 'EXPECTED']);
      }

      // 5. Create Income Entry for the ENTIRE package tied ONLY to the first instance per user request
      if (finalInstanceIds.length > 0) {
        const singleIncomeEntry = {
          retainer_instance_id: finalInstanceIds[0],
          client_id: contract.client_id,
          service_id: contract.service_id,
          amount: bulkTotal, // Entire amount!
          date: format(paymentDate, 'yyyy-MM-dd'),
          description: `${contract.name} - Bulk Package Payment (${numMonths}mo)`,
          category: 'Retainer',
          status: 'RECEIVED',
          payment_method: paymentMethod,
          milestone_label: 'Package Payment'
        };
        const { error: incError } = await supabase.from('income').insert([singleIncomeEntry]);
        if (incError) throw incError;
      }

      // 6. Generate one extra "upcoming" instance with standard status right after the package
      const extraMonthDate = format(addMonths(startMonth, numMonths), 'yyyy-MM-dd');
      // Check if extra month exists
      const { count: extraExists } = await supabase.from('monthly_instances').select('id', { count: 'exact' }).in('contract_version_id', versionIds).eq('month_date', extraMonthDate);
      if (!extraExists || extraExists === 0) {
        const { data: newExtra, error: errExtra } = await supabase.from('monthly_instances').insert([{
          contract_version_id: currentVersion.id,
          month_date: extraMonthDate,
          total_due: currentVersion.monthly_price,
          status: 'scheduled'
        }]).select();

        if (!errExtra && newExtra && newExtra.length > 0) {
          await supabase.from('income').insert([{
            retainer_instance_id: newExtra[0].id,
            client_id: contract.client_id,
            service_id: contract.service_id,
            amount: currentVersion.monthly_price,
            date: extraMonthDate,
            description: `${contract.name} - Full Payment`,
            category: 'Retainer',
            status: 'PENDING',
            milestone_label: 'Full Payment'
          }]);
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Failed to process package: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const standardPrice = currentVersion ? currentVersion.monthly_price * parseInt(months) : 0;
  const discount = standardPrice - (parseFloat(totalAmount) || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="text-orange-500" size={20} />
            Create Bulk Package
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label>Package Duration</Label>
            <div className="flex flex-wrap gap-2">
              {["3", "6", "12"].map((m) => (
                <Button
                  key={m}
                  variant={months === m ? "default" : "outline"}
                  onClick={() => setMonths(m)}
                  className={cn(
                    "flex-1 h-10 transition-all min-w-[80px]",
                    months === m ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" : "border-white/10 text-zinc-400 hover:bg-white/5"
                  )}
                >
                  {m} Months
                </Button>
              ))}
              <div className="relative flex-1 min-w-[100px]">
                <Input
                  type="number"
                  placeholder="Custom..."
                  className="h-10 bg-white/5 border-white/10 pr-2 pl-3 focus-visible:ring-orange-500/20"
                  value={!["3", "6", "12"].includes(months) ? months : ""}
                  onChange={(e) => setMonths(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Package Start Date</Label>
              <DatePicker
                date={packageStartMonth}
                setDate={(d) => d && setPackageStartMonth(d)}
                className="w-full bg-white/5 border-white/10 h-10"
              />
            </div>
            <div className="grid gap-2">
              <Label>Payment Date</Label>
              <DatePicker
                date={paymentDate}
                setDate={(d) => d && setPaymentDate(d)}
                className="w-full bg-white/5 border-white/10 h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Total Package Price</Label>
              <div className="relative">
                <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  type="number"
                  className="pl-9 bg-white/5 border-white/10 h-10"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
                  <SelectValue placeholder="Select Method" />
                </SelectTrigger>
                <SelectContent className="bg-[#16171D] border-white/10 text-white">
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {discount > 0 && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <Zap size={14} />
                <span>Total Discount Saved</span>
              </div>
              <span className="font-bold text-emerald-400">₹{discount.toLocaleString()}</span>
            </div>
          )}

        </div>

        <DialogFooter className="mt-4 sm:justify-center flex-row gap-4">
          <Button variant="ghost" onClick={onClose} className="h-11 text-zinc-400 hover:text-white hover:bg-white/5 px-8 rounded-xl font-medium transition-colors">Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold px-10 shadow-lg shadow-orange-500/20 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? "Processing..." : "Confirm & Pay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
