"use client";

import { useState, useEffect } from "react";
import { UpcomingSection } from "@/components/dashboard/upcoming-section";
import { FinancialSchedule } from "@/components/dashboard/financial-schedule";
import { IncomeExpenseBarChart } from "@/components/charts/income-expense-bar-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertTriangle, Activity, Wallet, Calendar as CalendarIcon, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServiceSelector } from "@/components/ui/service-selector";
import { ClientSelector } from "@/components/ui/client-selector";
import { RevenueAreaChart } from "@/components/charts/revenue-area-chart";
import { format, startOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Counter } from "@/components/ui/counter";
import { supabase } from "@/lib/supabase";
import { generateRetainerInstances } from "@/lib/retainer-logic";
import { generateExpenseInstances } from "@/lib/recurring-expenses-logic";

/**
 * 🏠 Dashboard Page
 * Updated for "Master Prompt" Strict Rules (Phase 1 & 2)
 * + FUNCTIONALITY RESTORED (Phase 4)
 */

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [date, setDate] = useState<Date>();
  const [greeting, setGreeting] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [forecastRange, setForecastRange] = useState("30");

  // Transaction Form State
  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    category: "General",
    date: new Date(),
    type: "income", // 'income' or 'expense'
    service_id: "" as string | null,
    service_name: "",
    client_id: "" as string | null,
    client_name: "",
    paymentMethod: "bank",
    status: "RECEIVED"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revenueView, setRevenueView] = useState<'lifetime' | 'monthly'>('lifetime');
  const [financials, setFinancials] = useState({
    revenue: 0,
    expenses: 0,
    netProfit: 0,
    margin: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    monthlyNetProfit: 0,
    monthlyMargin: 0
  });

  const [paymentMethods, setPaymentMethods] = useState<{ label: string, value: string }[]>([]);

  const [expenseCategories, setExpenseCategories] = useState<any[]>([]);

  useEffect(() => {
    // Trigger generation of recurring items on dashboard load to ensure ledger is up to date
    const syncRecurring = async () => {
      await generateRetainerInstances();
      await generateExpenseInstances();

      // Fetch Expense Categories
      const { data: catData } = await supabase.from('app_options').select('*').eq('group_name', 'expense_category');
      if (catData) setExpenseCategories(catData);

      // Auto-Overdue Rule: Mark items as OVERDUE if 7 days past due
      // We must respect 'expected_date' if it exists (snoozed items)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const thresholdDate = format(sevenDaysAgo, 'yyyy-MM-dd');

      const { data: candidates, error: fetchError } = await supabase
        .from('income')
        .select('id, date, expected_date, status')
        .neq('status', 'RECEIVED')
        .neq('status', 'OVERDUE')
        .lt('date', thresholdDate); // Initial filter by original date

      if (fetchError) console.error("Error fetching potential overdue items:", fetchError);

      if (candidates && candidates.length > 0) {
        // Filter out items that are snoozed (expected_date is in future or recent enough)
        const overdueIds = candidates
          .filter(item => {
            const effectiveDateStr = item.expected_date || item.date;
            // robust comparison using strings since format is YYYY-MM-DD
            return effectiveDateStr < thresholdDate;
          })
          .map(item => item.id);

        if (overdueIds.length > 0) {
          const { error: updateError } = await supabase
            .from('income')
            .update({ status: 'OVERDUE' })
            .in('id', overdueIds);

          if (updateError) console.error("Error auto-updating overdue items:", updateError);
        }
      }
    };
    syncRecurring();

    const fetchFinancials = async () => {
      // Fetch Total Income (Cash Basis - RECEIVED only)
      const { data: incomeData } = await supabase
        .from('income')
        .select('amount, date')
        .eq('status', 'RECEIVED');

      const totalIncome = incomeData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

      // Calculate Monthly Income
      const startOfCurrentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthlyIncome = incomeData
        ?.filter(item => item.date >= startOfCurrentMonth)
        .reduce((sum, item) => sum + Number(item.amount), 0) || 0;

      // Fetch Total Expenses (Cash Basis - PAID only)
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('amount, date')
        .eq('status', 'PAID');

      const totalExpenses = expensesData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

      const monthlyExpenses = expensesData
        ?.filter(item => item.date >= startOfCurrentMonth)
        .reduce((sum, item) => sum + Number(item.amount), 0) || 0;

      const netProfit = totalIncome - totalExpenses;
      const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      const monthlyNetProfit = monthlyIncome - monthlyExpenses;
      const monthlyMargin = monthlyIncome > 0 ? (monthlyNetProfit / monthlyIncome) * 100 : 0;

      setFinancials({
        revenue: totalIncome,
        expenses: totalExpenses,
        netProfit,
        margin,
        monthlyRevenue: monthlyIncome,
        monthlyExpenses,
        monthlyNetProfit,
        monthlyMargin
      });
    };

    fetchFinancials();

    // NEW: Fetch Payment Methods from Settings
    const fetchPaymentMethods = async () => {
      const { data } = await supabase.from('app_options').select('label, value').eq('group_name', 'payment_mode');
      if (data && data.length > 0) {
        setPaymentMethods(data);
      } else {
        // Fallback defaults if none configured
        setPaymentMethods([
          { label: 'Bank Transfer', value: 'bank' },
          { label: 'Credit Card', value: 'card' },
          { label: 'Cash', value: 'cash' },
          { label: 'UPI', value: 'upi' }
        ]);
      }
    };
    fetchPaymentMethods();

    const incomeSub = supabase.channel('dashboard-income').on('postgres_changes', { event: '*', schema: 'public', table: 'income' }, fetchFinancials).subscribe();
    const expenseSub = supabase.channel('dashboard-expenses').on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchFinancials).subscribe();

    return () => {
      supabase.removeChannel(incomeSub);
      supabase.removeChannel(expenseSub);
    }
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening");
    setCurrentDate(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    // Simulate API call
    setTimeout(() => {
      setIsSyncing(false);
      alert("Synced successfully with QuoteForge!");
    }, 2000);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Sanitize and validate amount
      const cleanAmount = formData.amount.replace(/[^0-9.]/g, '');
      const amountVal = parseFloat(cleanAmount);

      if (isNaN(amountVal) || amountVal <= 0) {
        alert("Please enter a valid amount");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        amount: amountVal,
        description: formData.description,
        date: format(formData.date, 'yyyy-MM-dd'), // Fix: Use local date string to avoid timezone shifts
        payment_method: formData.paymentMethod,
        category: formData.service_name || formData.category, // Use service name if available
        service_id: formData.type === "income" ? formData.service_id : null,
        client_id: formData.type === "income" ? formData.client_id : null,
        status: formData.status
      };

      let error;

      if (formData.type === "income") {
        if (!formData.service_id) {
          alert("Please select a service category");
          setIsSubmitting(false);
          return;
        }
        if (!formData.client_id) {
          // Optional: Force client selection? Users might expect it.
          // For now, let's allow empty client but warn? Or strictly require it.
          // Let's enforce for better data quality.
          const isConfirmed = confirm("No client selected. Continue without linking a client?");
          if (!isConfirmed) { setIsSubmitting(false); return; }
        }

        const { error: err } = await supabase.from("income").insert(payload);
        error = err;
      } else {
        // Construct clean payload for expenses (exclude income-specific fields)
        const expensePayload = {
          amount: amountVal,
          description: formData.description,
          date: format(formData.date, 'yyyy-MM-dd'),
          payment_method: formData.paymentMethod,
          category: formData.category || "General",
          status: formData.status,
          vendor: formData.description // Map description to vendor as fallback/default
        };

        const { error: err } = await supabase.from("expenses").insert(expensePayload);
        error = err;
      }

      if (error) throw error;

      setIsAddTransactionOpen(false);
      setFormData({
        type: "income",
        amount: "",
        description: "",
        paymentMethod: "bank",
        category: "General",
        client_id: null,
        client_name: "",
        service_id: null,
        service_name: "",
        date: new Date(),
        status: "RECEIVED"
      });
      alert("Transaction added successfully!");

      // Reload to refresh the newly added data in the UpcomingSection
      window.location.reload();

    } catch (err: any) {
      // Error adding transaction - show user-friendly message
      alert("Failed to add transaction: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-foreground font-sans p-6">
      {/* Container for content */}
      <div className="space-y-6">

        {/* --- A. Header with Safe Stats --- */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground min-h-[42px]">
              {greeting ? `${greeting}, Founder.` : <span className="opacity-0">Loading...</span>}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500">
                  <CalendarIcon size={14} />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 leading-none mb-0.5">Today</span>
                  <span className="text-xs font-bold text-zinc-200 leading-none">{currentDate || "..."}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="rounded-full border-white/10 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/5 h-10 px-6"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? "Syncing..." : "Sync QuoteForge"}
            </Button>

            <Dialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full shadow-lg shadow-orange-500/20 h-10 px-6 text-[13px] font-semibold border-0">
                  + Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#121214] border border-white/10 text-foreground sm:max-w-[480px] p-0 overflow-hidden shadow-2xl shadow-black/50">
                <DialogHeader className="px-6 py-5 border-b border-white/5 bg-[#161619] flex flex-row items-center justify-between">
                  <div>
                    <DialogTitle className="text-[17px] font-bold text-white tracking-tight flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                        <Wallet size={12} className="text-orange-500" />
                      </div>
                      New Entry
                    </DialogTitle>
                    <p className="text-[11px] text-zinc-500 font-medium mt-0.5 ml-8">Record income or an expense</p>
                  </div>
                </DialogHeader>

                <form onSubmit={handleAddTransaction} className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="type" className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Nature</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(val) => {
                          const newStatus = val === 'income' ? 'RECEIVED' : 'PAID';
                          setFormData({ ...formData, type: val, status: newStatus });
                        }}
                      >
                        <SelectTrigger className="bg-zinc-900/50 border-white/10 h-11 text-white focus:ring-orange-500/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#16171D] border-white/10 text-white">
                          <SelectItem value="income" className="focus:bg-orange-500/10 focus:text-orange-500">Income Entry</SelectItem>
                          <SelectItem value="expense" className="focus:bg-red-500/10 focus:text-red-500">Expense Entry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Amount (₹)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        className="bg-zinc-900/50 border-white/10 h-11 text-white focus-visible:ring-orange-500/20 font-mono"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="desc" className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                      {formData.type === "income" ? "Client & Description" : "Vendor & Description"}
                    </Label>
                    <div className="space-y-3">
                      {formData.type === "income" && (
                        <ClientSelector
                          value={formData.client_id}
                          onChange={(id, name) => setFormData({ ...formData, client_id: id, client_name: name })}
                        />
                      )}
                      <Input
                        id="desc"
                        placeholder={formData.type === "income" ? "Project details (e.g. Website Redesign)" : "e.g. Server Costs"}
                        className="bg-zinc-900/50 border-white/10 h-11 text-white focus-visible:ring-orange-500/20"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Category</Label>
                      {formData.type === 'income' ? (
                        <ServiceSelector
                          value={formData.service_id}
                          onChange={(id, name) => setFormData({ ...formData, service_id: id, service_name: name })}
                        />
                      ) : (
                        <Select
                          value={formData.category} // expenses use 'category' string
                          onValueChange={(val) => setFormData({ ...formData, category: val })}
                        >
                          <SelectTrigger className="bg-zinc-900/50 border-white/10 h-11 text-white focus:ring-orange-500/20">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#16171D] border-white/10 text-white">
                            {expenseCategories.map((opt: any) => (
                              <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Date</Label>
                      <DatePicker
                        date={formData.date}
                        setDate={(d) => d && setFormData({ ...formData, date: d })}
                        className="bg-zinc-900/50 border-white/10 h-11 text-white hover:bg-zinc-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="method" className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Payment Via</Label>
                      <Select
                        value={formData.paymentMethod}
                        onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
                      >
                        <SelectTrigger className="bg-zinc-900/50 border-white/10 h-11 text-white focus:ring-orange-500/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#16171D] border-white/10 text-white">
                          {paymentMethods.map((method) => (
                            <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(val) => setFormData({ ...formData, status: val })}
                      >
                        <SelectTrigger className={cn(
                          "bg-zinc-900/50 border-white/10 h-11 text-white focus:ring-orange-500/20",
                          formData.status === 'PENDING' || formData.status === 'UNPAID' ? "text-orange-500/80" : "text-emerald-500/80"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#16171D] border-white/10 text-white">
                          {formData.type === 'income' ? (
                            <>
                              <SelectItem value="RECEIVED" className="text-emerald-500">Received (Full)</SelectItem>
                              <SelectItem value="PENDING" className="text-orange-500">Pending Receipt</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="PAID" className="text-emerald-500">Paid (Full)</SelectItem>
                              <SelectItem value="UNPAID" className="text-orange-500">Unpaid / Owed</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" onClick={() => setIsAddTransactionOpen(false)} className="text-zinc-400 hover:text-white hover:bg-white/5">Cancel</Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:opacity-90 font-bold shadow-lg shadow-orange-500/20 px-8">
                      {isSubmitting ? "Saving..." : "Save Entry"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* --- A. NEW: Income & Asset Row (Replacing Old KPIs) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Total Income (Orange Theme) */}
          <Card className="border border-white/5 shadow-2xl bg-card rounded-3xl p-6 relative overflow-hidden group hover:bg-card transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <TrendingUp size={80} className="text-orange-500" />
            </div>
            <div className="flex flex-col relative z-10">
              <h3 className="text-[14px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {revenueView === 'lifetime' ? 'Total Revenue' : 'Monthly Revenue'}
              </h3>
              <div className="text-[42px] font-bold text-gradient-primary tracking-tight mb-2 text-white">
                <Counter value={revenueView === 'lifetime' ? financials.revenue : financials.monthlyRevenue} prefix="₹" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRevenueView(prev => prev === 'lifetime' ? 'monthly' : 'lifetime')}
                  className="h-6 px-3 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center cursor-pointer hover:bg-orange-500/20 transition-colors gap-1.5 group/btn"
                >
                  <Activity size={10} className="text-orange-500 group-hover/btn:animate-pulse" />
                  <span className="text-[11px] font-bold text-orange-500">
                    {revenueView === 'lifetime' ? 'Switch to Monthly' : 'Show All Time'}
                  </span>
                </button>
              </div>
            </div>
          </Card>


          {/* 2. Total Expenses (Dark Theme) */}
          <Card className="border border-white/5 shadow-2xl bg-card rounded-3xl p-6 relative overflow-hidden group hover:bg-card">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <Activity size={80} className="text-zinc-500" />
            </div>
            <div className="flex flex-col relative z-10">
              <h3 className="text-[14px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {revenueView === 'lifetime' ? 'Total Expenses' : 'Monthly Expenses'}
              </h3>
              <div className="text-[42px] font-bold text-white tracking-tight mb-2">
                <Counter value={revenueView === 'lifetime' ? financials.expenses : financials.monthlyExpenses} prefix="₹" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 px-2 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-zinc-400 font-mono">
                    {revenueView === 'lifetime' ? 'All Time' : 'Current Month'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* 3. NEW: Net Profit (Orange Theme) */}
          <Card className="border border-white/5 shadow-2xl bg-card rounded-3xl p-6 relative overflow-hidden group hover:bg-card">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Wallet size={80} className="text-orange-500" />
            </div>
            <div className="flex flex-col relative z-10">
              <h3 className="text-[14px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                {revenueView === 'lifetime' ? 'Net Profit' : 'Monthly Profit'}
              </h3>
              <div className={cn("text-[42px] font-bold tracking-tight mb-2", (revenueView === 'lifetime' ? financials.netProfit : financials.monthlyNetProfit) >= 0 ? "text-orange-500" : "text-red-500")}>
                <Counter value={revenueView === 'lifetime' ? financials.netProfit : financials.monthlyNetProfit} prefix="₹" />
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("h-6 px-2 rounded-full border flex items-center justify-center", (revenueView === 'lifetime' ? financials.margin : financials.monthlyMargin) >= 0 ? "bg-orange-500/10 border-orange-500/20 text-orange-500" : "bg-red-500/10 border-red-500/20 text-red-500")}>
                  <span className="text-[11px] font-bold">{(revenueView === 'lifetime' ? financials.margin : financials.monthlyMargin).toFixed(1)}% Margin</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* --- B. Main Content Grid (Charts Left, Actions Right) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-auto min-h-[500px]">

          {/* Left Column: Visuals (3/5 width) */}
          <div className="lg:col-span-3 space-y-6 flex flex-col">
            {/* Cashflow Forecast (Area Chart) - Priority Visual */}
            <Card className="border border-white/5 shadow-2xl bg-card rounded-3xl flex-1 flex flex-col relative overflow-hidden min-h-[350px] group hover:bg-card">
              <div className="p-6 flex justify-between items-center border-b border-white/10 bg-card z-10">
                <h3 className="text-[18px] font-semibold text-foreground">Cashflow Forecast</h3>
                <div className="flex bg-zinc-900/50 rounded-full p-1 border border-white/5">
                  {["30", "60", "90"].map((range) => (
                    <button
                      key={range}
                      onClick={() => setForecastRange(range)}
                      className={cn(
                        "px-3 py-1 text-[10px] font-bold rounded-full transition-all duration-200",
                        forecastRange === range
                          ? "bg-white text-black shadow-sm"
                          : "text-muted-foreground hover:text-white"
                      )}
                    >
                      {range}D
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 w-full min-h-0">
                {/* @ts-ignore */}
                <RevenueAreaChart range={forecastRange} />
              </div>
            </Card>

            {/* Performance Trend (Bar Chart) - Supporting Visual */}
            <Card className="border border-white/5 shadow-2xl bg-card rounded-3xl flex-1 flex flex-col min-h-[300px] group hover:bg-card overflow-hidden">
              <div className="p-6 flex justify-between items-center border-b border-white/10 bg-card z-10">
                <h3 className="text-[18px] font-semibold text-foreground">Performance Trend</h3>
              </div>
              <div className="flex-1 w-full min-h-0 bg-card">
                <IncomeExpenseBarChart />
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 h-full flex flex-col gap-6">
            <div className="flex-1 min-h-[300px]">
              <FinancialSchedule />
            </div>

            <div className="flex-1 min-h-[300px] flex flex-col bg-card border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <div className="flex-1 overflow-y-auto">
                <UpcomingSection />
              </div>
            </div>
          </div>

        </div>

        {/* Re-adding the Dialog here to ensure it uses the updated design if it was part of the earlier block, but actually the Dialog is in the Header. Let's verify where the Dialog code is. */}
        {/* The Dialog is in the header, lines 199-277. I need to target that range to redesign the popup. */}
      </div>
    </div>
  );
}
