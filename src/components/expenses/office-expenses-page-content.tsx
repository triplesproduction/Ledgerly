"use client";

import { useState, useEffect, Suspense, Fragment as Blank } from "react";
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
    Plus, 
    Building2, 
    Calendar, 
    TrendingUp, 
    ShoppingBag, 
    History, 
    ArrowRightLeft,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    IndianRupee,
    Edit2,
    Trash2,
    MoreVertical
} from "lucide-react";
import { MonthFilter } from "@/components/ui/month-filter";
import { startOfMonth, endOfMonth, format, isSameMonth, subMonths, eachMonthOfInterval } from "date-fns";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { AddOfficeExpenseDialog } from "@/components/expenses/add-office-expense-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FundsWithDad } from "@/components/expenses/funds-with-dad";
import { PurchasePlanner } from "@/components/expenses/purchase-planner";
import { LoanManagement } from "@/components/expenses/loan-management";
import { Label } from "@/components/ui/label";
import { ExpenseTrendChart, CategoryBreakdownChart } from "@/components/expenses/charts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
    id: string;
    name: string;
    slug: string;
}

function formatCurrency(amount: number) {
    return `₹${Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function OfficeExpensesPageContent() {
    const [expensesData, setExpensesData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [paidByFilter, setPaidByFilter] = useState("all");
    const [activeTab, setActiveTab] = useState("analytics");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [isAddingPlan, setIsAddingPlan] = useState(false);
    const [isAddingLoan, setIsAddingLoan] = useState(false);
    const [editingExpense, setEditingExpense] = useState<any | null>(null);
    const [isChartPopupOpen, setIsChartPopupOpen] = useState(false);
    const ITEMS_PER_PAGE = 50;

    // Metrics
    const [metrics, setMetrics] = useState({
        totalPeriodExpense: 0,
        paidByYou: 0,
        paidByDad: 0,
        balanceWithDad: 0,
        totalSentToDad: 0,
        totalSpentByDad: 0,
        totalBorrowed: 0,
        totalRepaid: 0,
    });
    const [viewMetrics, setViewMetrics] = useState({
        total: 0,
        you: 0,
        dad: 0
    });

    const [trendData, setTrendData] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    const [purchasePlans, setPurchasePlans] = useState<any[]>([]);
    const [loans, setLoans] = useState<any[]>([]);
    const [repayments, setRepayments] = useState<any[]>([]);
    const [convertingPlan, setConvertingPlan] = useState<any | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [transfers, setTransfers] = useState<any[]>([]);

    const searchParams = useSearchParams();

    const fetchAllData = async () => {
        setIsLoading(true);
        const fromParam = searchParams?.get('from');
        const toParam = searchParams?.get('to');
        const now = new Date();
        
        const fromDate = fromParam ? new Date(fromParam) : startOfMonth(subMonths(now, 5));
        const toDate = toParam ? new Date(toParam) : endOfMonth(now);

        const { data: catData } = await supabase.from('office_categories').select('*').order('name');
        if (catData) setCategories(catData);

        const fromStr = format(fromDate, 'yyyy-MM-dd');
        const toStr = format(toDate, 'yyyy-MM-dd');

        // 1. Fetch Expenses (Filtered for Ledger)
        const offset = (page - 1) * ITEMS_PER_PAGE;
        const limit = offset + ITEMS_PER_PAGE - 1;
        
        let tableQuery = supabase.from('expenses').select('*', { count: 'exact' }).ilike('expense_type', 'office_%');
        tableQuery = tableQuery.neq('status', 'SCHEDULED').gte('date', fromStr).lte('date', toStr);
        
        if (categoryFilter !== 'all') {
            tableQuery = tableQuery.eq('category', categoryFilter);
        }
        if (paidByFilter !== 'all') {
            tableQuery = tableQuery.eq('expense_type', paidByFilter === 'You' ? 'office_you' : 'office_dad');
        }
        if (searchTerm.trim()) {
            tableQuery = tableQuery.or(`description.ilike.%${searchTerm}%,vendor.ilike.%${searchTerm}%`);
        }
        
        const { data: expenses, count } = await tableQuery.order('date', { ascending: false }).range(offset, limit);
        if (count !== null) setTotalPages(Math.ceil(count / ITEMS_PER_PAGE) || 1);
        if (expenses) setExpensesData(expenses);

        // 2. Fetch All Data for Analytics
        const { data: allExpenses } = await supabase.from('expenses').select('amount, expense_type, date, category').ilike('expense_type', 'office_%').neq('status', 'SCHEDULED');
        let vMet = { total: 0, you: 0, dad: 0 };
        const { data: allTransfers } = await supabase.from('fund_transfers').select('*').order('date', { ascending: false });
        if (allTransfers) setTransfers(allTransfers);
        const { data: allLoans } = await supabase.from('loans').select('amount_received, date');
        const { data: allLoanRepayments } = await supabase.from('loan_repayments').select('amount_paid, date');

        // 3. Process Charts & Metrics
        let periodTotal = 0;
        let paidYou = 0;
        let paidDad = 0;
        let spentByDad = 0;

        // Group by Month for Trend
        const months = eachMonthOfInterval({ start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) });
        const monthlyMap: Record<string, number> = {};
        months.forEach(m => monthlyMap[format(m, 'MMM')] = 0);

        // Group by Category
        const categoryMap: Record<string, number> = {};

        allExpenses?.forEach(exp => {
            const amt = Number(exp.amount);
            periodTotal += amt;
            const paidBy = exp.expense_type === 'office_dad' ? 'Dad' : 'You';
            if (paidBy === 'You') paidYou += amt;
            if (paidBy === 'Dad') {
                paidDad += amt;
                spentByDad += amt;
            }

            const mName = format(new Date(exp.date), 'MMM');
            if (monthlyMap[mName] !== undefined) monthlyMap[mName] += amt;

            categoryMap[exp.category] = (categoryMap[exp.category] || 0) + amt;

            // View Metrics Calculation (Filtered by State)
            const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
            const matchesPaidBy = paidByFilter === 'all' || (paidByFilter === 'You' ? exp.expense_type === 'office_you' : exp.expense_type === 'office_dad');
            
            if (matchesCategory && matchesPaidBy) {
                if (exp.expense_type === 'office_you') vMet.you += amt;
                if (exp.expense_type === 'office_dad') vMet.dad += amt;
                vMet.total += amt;
            }
        });

        setViewMetrics(vMet);

        setTrendData(Object.entries(monthlyMap).map(([name, amount]) => ({ name, amount })));
        setCategoryData(Object.entries(categoryMap).map(([name, value]) => ({ 
            name: categories.find(c => c.slug === name)?.name || name, 
            value 
        })));

        let sentToDadTotal = 0;
        allTransfers?.forEach(tr => {
            if (tr.from_person === 'You' && tr.to_person === 'Dad') sentToDadTotal += Number(tr.amount);
        });

        let borrowedTotal = 0;
        let repaidTotal = 0;
        allLoans?.forEach(l => { borrowedTotal += Number(l.amount_received); });
        allLoanRepayments?.forEach(r => { repaidTotal += Number(r.amount_paid); });

        setMetrics({
            totalPeriodExpense: periodTotal,
            paidByYou: paidYou,
            paidByDad: paidDad,
            totalSentToDad: sentToDadTotal,
            totalSpentByDad: spentByDad,
            balanceWithDad: sentToDadTotal - spentByDad,
            totalBorrowed: borrowedTotal,
            totalRepaid: repaidTotal,
        });

        // 4. Other stuff
        const { data: pmData } = await supabase.from('app_options').select('label, value').eq('group_name', 'payment_mode');
        if (pmData) setPaymentMethods(pmData);

        const { data: plans } = await supabase.from('purchase_plans').select('*').order('created_at', { ascending: false });
        if (plans) setPurchasePlans(plans);

        const { data: loansData } = await supabase.from('loans').select('*').order('date', { ascending: false });
        if (loansData) setLoans(loansData);

        const { data: repaymentsData } = await supabase.from('loan_repayments').select('*').order('date', { ascending: false });
        if (repaymentsData) setRepayments(repaymentsData);

        setIsLoading(false);
    };

    useEffect(() => {
        fetchAllData();
        const subs = [
            supabase.channel('office_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchAllData).subscribe(),
            supabase.channel('transfer_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'fund_transfers' }, fetchAllData).subscribe(),
            supabase.channel('plan_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_plans' }, fetchAllData).subscribe(),
            supabase.channel('loan_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, fetchAllData).subscribe(),
            supabase.channel('repay_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'loan_repayments' }, fetchAllData).subscribe()
        ];
        return () => { subs.forEach(s => supabase.removeChannel(s)); };
    }, [categoryFilter, paidByFilter, page, searchParams, searchTerm]);

    const handleDeleteExpense = async (expenseId: string) => {
        if (!confirm("Are you sure you want to delete this expense?")) return;
        
        try {
            const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
            if (error) throw error;
            fetchAllData();
        } catch (err: any) {
            alert("Error deleting: " + err.message);
        }
    };

    const handleConvertToExpense = (plan: any) => {
        setConvertingPlan(plan);
        setActiveTab("expenses");
    };

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-[1600px] mx-auto pb-32 lg:pb-12">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Building2 className="text-orange-500 h-8 w-8" /> Office Control
                    </h1>
                    <p className="text-sm text-zinc-500 font-medium mt-1">Premium management for internal operations and cash handling.</p>
                </div>
                <div className="flex items-center gap-4">
                </div>
            </div>

            {/* Tab Navigation & Metrics Row */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6 sm:space-y-8">
                <div className="flex flex-col sm:flex-row items-center justify-between w-full border-b border-white/5 pb-4 px-1 gap-y-4 sm:gap-y-0">
                    {/* Tabs (Left on Desktop, Top on Mobile) */}
                    <div className="w-full sm:w-auto flex items-center overflow-x-auto no-scrollbar -mx-1 px-1">
                        <TabsList className="bg-zinc-900/50 border border-white/5 p-1 rounded-2xl h-11 sm:h-12 w-fit shrink-0">
                            <TabsTrigger value="analytics" className="px-5 sm:px-6 rounded-xl data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all text-[11px] sm:text-xs font-bold uppercase tracking-widest flex-none">Analytics</TabsTrigger>
                            <TabsTrigger value="expenses" className="px-5 sm:px-6 rounded-xl data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all text-[11px] sm:text-xs font-bold uppercase tracking-widest flex-none">Expenses</TabsTrigger>
                            <TabsTrigger value="planner" className="px-5 sm:px-6 rounded-xl data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all text-[11px] sm:text-xs font-bold uppercase tracking-widest flex-none">Planner</TabsTrigger>
                            <TabsTrigger value="loans" className="px-5 sm:px-6 rounded-xl data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all text-[11px] sm:text-xs font-bold uppercase tracking-widest flex-none">Loans</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Actions & Metrics (Right on Desktop, Bottom on Mobile) */}
                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 sm:gap-5 z-10">
                        {/* Dynamic Metrics */}
                        {activeTab === 'analytics' && (
                            <div className="flex items-center bg-orange-500/10 border border-orange-500/20 px-3 sm:px-4 h-10 sm:h-11 rounded-xl gap-2 sm:gap-3 shadow-lg shadow-orange-500/5 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
                                <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.05em] sm:tracking-widest text-orange-500/80 whitespace-nowrap">Total</span>
                                <span className="text-[11px] sm:text-sm font-black text-white tabular-nums">
                                    {formatCurrency(metrics.totalPeriodExpense).replace('.00', '')}
                                </span>
                            </div>
                        )}
                        {activeTab === 'planner' && (
                            <div className="flex items-center bg-orange-500/10 border border-orange-500/20 px-3 sm:px-4 h-10 sm:h-11 rounded-xl gap-2 sm:gap-3 shadow-lg shadow-orange-500/5 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
                                <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.05em] sm:tracking-widest text-orange-500/80 whitespace-nowrap">Required</span>
                                <span className="text-[11px] sm:text-sm font-black text-white tabular-nums">
                                    {formatCurrency(purchasePlans.filter(p => p.status === 'Planned').reduce((acc, curr) => acc + Number(curr.estimated_cost), 0)).replace('.00', '')}
                                </span>
                            </div>
                        )}
                        {activeTab === 'loans' && (
                            <div className="flex items-center bg-orange-500/10 border border-orange-500/20 px-3 sm:px-4 h-10 sm:h-11 rounded-xl gap-2 sm:gap-3 shadow-lg shadow-orange-500/5 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300">
                                <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.05em] sm:tracking-widest text-orange-500/80 whitespace-nowrap">Liability</span>
                                <span className="text-[11px] sm:text-sm font-black text-white tabular-nums">
                                    {formatCurrency(metrics.totalBorrowed - metrics.totalRepaid).replace('.00', '')}
                                </span>
                            </div>
                        )}

                        {activeTab === 'analytics' && (
                            <AddOfficeExpenseDialog 
                                paymentMethods={paymentMethods} 
                                categories={categories}
                                onSuccess={fetchAllData} 
                                initialData={editingExpense || convertingPlan}
                                open={!!(editingExpense || convertingPlan || isAddingExpense)}
                                onOpenChange={(open) => {
                                    if (!open) {
                                        setConvertingPlan(null);
                                        setEditingExpense(null);
                                        setIsAddingExpense(false);
                                    } else {
                                        setIsAddingExpense(true);
                                    }
                                }}
                            />
                        )}

                        {activeTab === 'expenses' && (
                            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 duration-300">
                                <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
                                    {['all', 'You', 'Dad'].map((opt) => (
                                        <button 
                                            key={opt}
                                            onClick={() => setPaidByFilter(opt as any)}
                                            className={cn(
                                                "px-4 h-8 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                                                paidByFilter === opt ? "bg-orange-600 text-white shadow-lg shadow-orange-500/20" : "text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            {opt === 'all' ? 'All' : opt === 'You' ? 'Me' : 'Dad'}
                                        </button>
                                    ))}
                                </div>

                                <Button 
                                    onClick={() => setIsChartPopupOpen(true)}
                                    variant="outline"
                                    className="border-white/5 bg-white/5 hover:bg-white/10 text-white rounded-xl h-10 px-4 font-bold flex items-center gap-2"
                                >
                                    <TrendingUp size={16} className="text-orange-500" /> View Chart
                                </Button>

                                <AddOfficeExpenseDialog 
                                    paymentMethods={paymentMethods} 
                                    categories={categories}
                                    onSuccess={fetchAllData} 
                                    initialData={editingExpense || convertingPlan}
                                    open={!!(editingExpense || convertingPlan || isAddingExpense)}
                                    onOpenChange={(open) => {
                                        if (!open) {
                                            setConvertingPlan(null);
                                            setEditingExpense(null);
                                            setIsAddingExpense(false);
                                        } else {
                                            setIsAddingExpense(true);
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {activeTab === 'planner' && (
                            <Button 
                                onClick={() => setIsAddingPlan(true)}
                                className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-11 px-5 gap-2 font-bold shadow-lg shadow-orange-500/20"
                            >
                                <Plus size={18} /> New Planned Purchase
                            </Button>
                        )}
                        {activeTab === 'loans' && (
                            <Button 
                                onClick={() => setIsAddingLoan(true)}
                                className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-11 px-5 gap-2 font-bold shadow-lg shadow-orange-500/20"
                            >
                                <Plus size={18} /> Record New Loan
                            </Button>
                        )}
                    </div>
                </div>

                {/* --- Analytics Tab --- */}
                <TabsContent value="analytics" className="space-y-8 outline-none mt-0">
                    {/* Top Summary Metrics - Premium Grid Layout */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        
                        <Card className="rounded-2xl border border-white/5 bg-card px-4 sm:px-6 py-5 sm:py-7 shadow-2xl backdrop-blur-md group hover:border-emerald-500/20 transition-all flex flex-col justify-between min-h-[140px] sm:min-h-[150px]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                                    <TrendingUp className="text-emerald-500 h-4 w-4 sm:h-5 sm:w-5" />
                                </div>
                                <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 group-hover:text-emerald-500/80 transition-colors">Spent By You</p>
                            </div>
                            <p className="text-2xl sm:text-3xl font-bold text-emerald-500 tracking-tight mt-4 sm:mt-6">
                                {formatCurrency(metrics.paidByYou).replace('.00', '')}
                                <span className="text-sm sm:text-base opacity-40">.00</span>
                            </p>
                        </Card>

                        <Card className="rounded-2xl border border-white/5 bg-card px-4 sm:px-6 py-5 sm:py-7 shadow-2xl backdrop-blur-md group hover:border-orange-500/20 transition-all flex flex-col justify-between min-h-[140px] sm:min-h-[150px]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-xl group-hover:bg-orange-500/20 transition-colors">
                                    <History className="text-orange-500 h-4 w-4 sm:h-5 sm:w-5" />
                                </div>
                                <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 group-hover:text-orange-500/80 transition-colors">Spent By Dad</p>
                            </div>
                            <p className="text-2xl sm:text-3xl font-bold text-orange-500 tracking-tight mt-4 sm:mt-6">
                                {formatCurrency(metrics.paidByDad).replace('.00', '')}
                                <span className="text-sm sm:text-base opacity-40">.00</span>
                            </p>
                        </Card>

                        <Card className="rounded-2xl border border-white/5 bg-card px-4 sm:px-6 py-5 sm:py-7 shadow-2xl backdrop-blur-md group hover:border-blue-500/20 transition-all flex flex-col justify-between min-h-[140px] sm:min-h-[150px]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                                    <Building2 className="text-blue-500 h-4 w-4 sm:h-5 sm:w-5" />
                                </div>
                                <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 group-hover:text-blue-500/80 transition-colors">Dad Balance</p>
                            </div>
                            <p className="text-2xl sm:text-3xl font-bold text-blue-500 tracking-tight mt-4 sm:mt-6">
                                {formatCurrency(metrics.balanceWithDad).replace('.00', '')}
                                <span className="text-sm sm:text-base opacity-40">.00</span>
                            </p>
                        </Card>

                        <Card className="rounded-2xl border border-white/5 bg-card px-4 sm:px-6 py-5 sm:py-7 shadow-2xl backdrop-blur-md group hover:border-rose-500/20 transition-all flex flex-col justify-between min-h-[140px] sm:min-h-[150px]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-500/10 rounded-xl group-hover:bg-rose-500/20 transition-colors">
                                    <ArrowRightLeft className="text-rose-500 h-4 w-4 sm:h-5 sm:w-5" />
                                </div>
                                <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 group-hover:text-rose-500/80 transition-colors">Loans Net</p>
                            </div>
                            <p className="text-2xl sm:text-3xl font-bold text-rose-500 tracking-tight mt-4 sm:mt-6">
                                {formatCurrency(metrics.totalBorrowed - metrics.totalRepaid).replace('.00', '')}
                                <span className="text-sm sm:text-base opacity-40">.00</span>
                            </p>
                        </Card>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                        <Card className="rounded-2xl border border-white/5 bg-card p-6 shadow-2xl backdrop-blur-md">
                            <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
                                <TrendingUp className="text-orange-500 h-5 w-5" /> Spending Trend
                            </h3>
                            <ExpenseTrendChart data={trendData} />
                        </Card>
                        <Card className="rounded-2xl border border-white/5 bg-card p-6 shadow-2xl backdrop-blur-md">
                            <h3 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
                                <ShoppingBag className="text-blue-500 h-5 w-5" /> Category Breakdown
                            </h3>
                            <CategoryBreakdownChart data={categoryData} />
                        </Card>
                    </div>

                    {/* Funds Management Area */}
                    <div className="grid gap-6 grid-cols-1 xl:grid-cols-12 items-start">
                        <div className="xl:col-span-8">
                            <FundsWithDad 
                                balance={metrics.balanceWithDad} 
                                totalSent={metrics.totalSentToDad}
                                totalSpent={metrics.totalSpentByDad}
                                transfers={transfers}
                                onSuccess={fetchAllData} 
                            />
                        </div>
                        <div className="xl:col-span-4">
                            <Card className="rounded-2xl border border-white/5 bg-card p-6 shadow-2xl backdrop-blur-md h-full">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <TrendingUp className="text-emerald-500 h-4 w-4" /> System Health
                                </h3>
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-1">Gross Internal Debt</p>
                                        <p className="text-xl font-bold text-white italic">{formatCurrency(metrics.totalBorrowed)}</p>
                                    </div>
                                    <div className="pt-6 border-t border-white/5">
                                        <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider mb-1">Operational Capacity</p>
                                        <p className="text-sm text-zinc-300 leading-relaxed italic">All internal ledgers are balanced daily. Settle "Dad Balance" before quarter-end to maintain clean reporting.</p>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- Expenses Tab --- */}
                <TabsContent value="expenses" className="space-y-6 outline-none mt-0">                     <Card className="p-2 sm:p-3 rounded-2xl border border-white/5 bg-zinc-900/10 backdrop-blur-sm shadow-xl overflow-hidden">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10 py-1">
                            {/* 1. Category Dropdown */}
                            <div className="w-full sm:w-[190px]">
                                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                    <SelectTrigger className="h-10 bg-white/5 border-white/5 rounded-xl text-xs font-bold uppercase tracking-tight text-zinc-300 hover:bg-white/[0.08] transition-all w-full">
                                        <div className="flex items-center gap-2">
                                            <ShoppingBag size={14} className="text-orange-500" />
                                            <SelectValue placeholder="Category" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-2xl">
                                        <SelectItem value="all" className="py-2.5 px-4 focus:bg-orange-600/20 focus:text-orange-500 rounded-xl">All Categories</SelectItem>
                                        <div className="h-px bg-white/5 my-1" />
                                        {categories.map(cat => (
                                            <SelectItem key={cat.id} value={cat.slug} className="py-2.5 px-4 focus:bg-orange-600/20 focus:text-orange-500 rounded-xl">
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* 2. Date Filter (Integrated) */}
                            <div className="flex items-center justify-center w-full sm:w-auto">
                                <Suspense fallback={<div className="h-10 w-32 animate-pulse bg-white/5 rounded-xl" />}>
                                    <MonthFilter />
                                </Suspense>
                            </div>

                            <div className="flex-1 hidden sm:block" />
                        </div>
                    </Card>

                    <Card className="rounded-2xl border border-white/5 bg-card overflow-hidden shadow-2xl">
                        <div className="overflow-x-auto no-scrollbar">
                            <Table className="min-w-[800px]">
                            <TableHeader className="bg-white/[0.02]">
                                <TableRow className="border-white/5 hover:bg-transparent">
                                    <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-14 pl-8">Item</TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-14 px-4 w-[180px]">Vendor</TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-14 px-4 w-[180px]">Category</TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-14 px-4 text-center w-[120px]">Paid By</TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-14 px-4 text-right w-[150px]">Amount</TableHead>
                                    <TableHead className="text-xs font-bold uppercase tracking-widest text-zinc-500 h-14 px-4 text-right w-[150px]">Date</TableHead>
                                    <TableHead className="w-[80px] pr-8"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={7} className="h-64 text-center text-zinc-500 italic">Initializing ledger...</TableCell></TableRow>
                                ) : expensesData.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="h-64 text-center text-zinc-500 italic font-medium">No transactions recorded yet.</TableCell></TableRow>
                                ) : (
                                    expensesData.map((exp) => (
                                        <TableRow key={exp.id} className="border-white/5 hover:bg-white/[0.02] transition-colors group">
                                            <TableCell className="pl-8 py-5">
                                                <div className="font-semibold text-white text-sm truncate max-w-[250px]">{exp.description}</div>
                                            </TableCell>
                                            <TableCell className="px-4 py-5">
                                                <span className="bg-zinc-500/10 text-zinc-400 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-[0.05em] border border-white/5 truncate max-w-[150px] inline-block">
                                                    {exp.vendor || 'Direct'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-5">
                                                <span className="bg-white/5 text-zinc-300 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border border-white/5 truncate max-w-[150px] inline-block">
                                                    {categories.find(c => c.slug === exp.category)?.name || exp.category.replace('_', ' ')}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-5 text-center">
                                                <div className={cn("text-xs font-bold px-3 py-1.5 rounded-lg mx-auto w-fit", exp.expense_type === 'office_you' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10" : "bg-orange-500/10 text-orange-500 border border-orange-500/10")}>
                                                    {exp.expense_type === 'office_dad' ? 'Dad' : 'You'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-5 font-bold text-white text-[15px] italic tabular-nums text-right">{formatCurrency(exp.amount)}</TableCell>
                                            <TableCell className="px-4 py-5 text-xs text-zinc-500 font-medium text-right">{format(new Date(exp.date), "dd MMM, yyyy")}</TableCell>
                                            <TableCell className="pr-8 py-5 text-right w-[80px]">
                                                <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-9 w-9 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl"
                                                        onClick={() => {
                                                            setEditingExpense(exp);
                                                            setIsAddingExpense(true);
                                                        }}
                                                    >
                                                        <Edit2 size={15} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        </div>
                        {totalPages > 1 && (
                            <div className="p-6 border-t border-white/5 flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                <div>Page {page} of {totalPages}</div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-9 border-white/5 bg-white/5 rounded-xl hover:bg-white/10 px-5">Prev</Button>
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-9 border-white/5 bg-white/5 rounded-xl hover:bg-white/10 px-5">Next</Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </TabsContent>

                {/* --- Planner Tab --- */}
                <TabsContent value="planner" className="outline-none mt-0">
                    <PurchasePlanner 
                        plans={purchasePlans} 
                        onSuccess={fetchAllData} 
                        onConvertToExpense={handleConvertToExpense}
                        open={isAddingPlan}
                        onOpenChange={setIsAddingPlan}
                    />
                </TabsContent>

                {/* --- Loans Tab --- */}
                <TabsContent value="loans" className="outline-none mt-0">
                    <LoanManagement 
                        loans={loans} 
                        repayments={repayments} 
                        onSuccess={fetchAllData}
                        isAddingLoan={isAddingLoan}
                        onAddingLoanChange={setIsAddingLoan}
                    />
                </TabsContent>
            </Tabs>

            {/* Quick Chart Modal */}
            <Dialog open={isChartPopupOpen} onOpenChange={setIsChartPopupOpen}>
                <DialogContent className="w-[95vw] max-w-4xl bg-zinc-950 border-white/5 p-4 sm:p-5 sm:pb-3 rounded-[2rem] shadow-2xl backdrop-blur-3xl outline-none gap-0 overflow-hidden">
                    <DialogHeader className="mb-4 sm:mb-5 text-left">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-orange-600/20 rounded-xl">
                                <TrendingUp className="text-orange-600 h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                            <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                Period Performance
                            </DialogTitle>
                        </div>
                        <p className="text-zinc-500 text-[10px] sm:text-xs font-bold uppercase tracking-[0.1em]">Instant financial overview for the selected range.</p>
                    </DialogHeader>

                    <Card className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 sm:pb-2 overflow-hidden shadow-2xl border-t border-white/10">
                        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <TrendingUp className="text-orange-500 h-3 w-3 sm:h-4 sm:w-4" /> Monthly Momentum
                        </h3>
                        <div className="h-[250px] sm:h-[380px] w-full">
                            <ExpenseTrendChart data={trendData} />
                        </div>
                    </Card>
                </DialogContent>
            </Dialog>
        </div>
    );
}
