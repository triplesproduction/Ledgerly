"use client";

import { useState, useEffect, Suspense, Fragment as Blank } from "react";
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Building2, TrendingUp, Calendar, CreditCard } from "lucide-react";
import { MonthFilter } from "@/components/ui/month-filter";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format, isSameMonth } from "date-fns";
import { supabase } from "@/lib/supabase";
import { AddOfficeExpenseDialog } from "@/components/expenses/add-office-expense-dialog";
import { EditOfficeExpenseDialog } from "@/components/expenses/edit-office-expense-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

const OFFICE_CATEGORIES = [
    { value: "office_setup", label: "Office Setup" },
    { value: "office_supplies", label: "Office Supplies" },
    { value: "utilities", label: "Utilities" },
    { value: "maintenance", label: "Maintenance" },
    { value: "furniture", label: "Furniture" },
    { value: "equipment", label: "Equipment" },
    { value: "other", label: "Other" },
];

function formatCurrency(amount: number) {
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

export default function OfficeExpensesPage() {
    const [editingExpense, setEditingExpense] = useState<any | null>(null);

    // Data State
    const [expensesData, setExpensesData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [categoryFilter, setCategoryFilter] = useState("all");
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const ITEMS_PER_PAGE = 15;

    // Metrics State
    const [thisMonthTotal, setThisMonthTotal] = useState(0);
    const [thisYearTotal, setThisYearTotal] = useState(0);
    const [setupTotal, setSetupTotal] = useState(0);

    const searchParams = useSearchParams();

    useEffect(() => {
        const fetchPaymentMethods = async () => {
            const { data } = await supabase.from('app_options').select('label, value').eq('group_name', 'payment_mode');
            if (data && data.length > 0) {
                setPaymentMethods(data);
            } else {
                setPaymentMethods([
                    { label: 'Bank Transfer', value: 'bank' },
                    { label: 'Credit Card', value: 'card' },
                    { label: 'Cash', value: 'cash' },
                    { label: 'UPI', value: 'upi' }
                ]);
            }
        };
        fetchPaymentMethods();
    }, []);

    const fetchMetrics = async () => {
        const now = new Date();
        const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
        const yearStart = format(startOfYear(now), 'yyyy-MM-dd');
        const yearEnd = format(endOfYear(now), 'yyyy-MM-dd');

        // This Month
        const { data: monthData } = await supabase
            .from('expenses')
            .select('amount')
            .eq('expense_type', 'office')
            .gte('date', monthStart)
            .lte('date', monthEnd)
            .eq('status', 'PAID');
        setThisMonthTotal(monthData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0);

        // This Year
        const { data: yearData } = await supabase
            .from('expenses')
            .select('amount')
            .eq('expense_type', 'office')
            .gte('date', yearStart)
            .lte('date', yearEnd)
            .eq('status', 'PAID');
        setThisYearTotal(yearData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0);

        // Total Setup Cost
        const { data: setupData } = await supabase
            .from('expenses')
            .select('amount')
            .eq('expense_type', 'office')
            .eq('category', 'office_setup')
            .eq('status', 'PAID');
        setSetupTotal(setupData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0);
    };

    const fetchExpenses = async () => {
        setIsLoading(true);

        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
        const fromParam = params.get('from');
        const toParam = params.get('to');

        const now = new Date();
        const from = fromParam ? new Date(fromParam) : startOfMonth(now);
        const toDate = toParam ? new Date(toParam) : endOfMonth(now);

        if (isNaN(from.getTime()) || isNaN(toDate.getTime())) {
            setIsLoading(false);
            return;
        }

        const fromStr = format(from, 'yyyy-MM-dd');
        const toStr = format(toDate, 'yyyy-MM-dd');
        const offset = (page - 1) * ITEMS_PER_PAGE;
        const limit = offset + ITEMS_PER_PAGE - 1;

        let query = supabase
            .from('expenses')
            .select('*', { count: 'exact' })
            .eq('expense_type', 'office')
            .gte('date', fromStr)
            .lte('date', toStr);

        if (categoryFilter !== 'all') {
            query = query.eq('category', categoryFilter);
        }



        const isCurrentMonth = isSameMonth(new Date(), from);

        const { data, count, error } = await query
            .order('date', { ascending: !isCurrentMonth })
            .range(offset, limit);

        if (count !== null) setTotalPages(Math.ceil(count / ITEMS_PER_PAGE) || 1);

        if (data) {
            setExpensesData(data);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchMetrics();
    }, []);

    useEffect(() => {
        fetchExpenses();
        const subscription = supabase
            .channel('public:office_expenses')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: "expense_type=eq.office" }, () => {
                fetchExpenses();
                fetchMetrics();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [page, categoryFilter, searchParams]);

    const getCategoryLabel = (val: string) => OFFICE_CATEGORIES.find(c => c.value === val)?.label || val;

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-6 pb-24 lg:pb-6 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Building2 className="text-orange-500 h-8 w-8" />
                        Office Expenses
                    </h1>
                    <p className="text-muted-foreground mt-1">Track internal operational and setup costs.</p>
                </div>
                <AddOfficeExpenseDialog
                    paymentMethods={paymentMethods}
                    onSuccess={() => { fetchExpenses(); fetchMetrics(); }}
                />
            </div>

            {/* Metrics Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-card/50 border-white/5 shadow-2xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardHeader className="flex flex-row items-center justify-between pt-6 px-6 pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-orange-500" />
                            This Month
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                        <div className="text-3xl font-bold text-white tracking-tight">
                            {formatCurrency(thisMonthTotal)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-white/5 shadow-2xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardHeader className="flex flex-row items-center justify-between pt-6 px-6 pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            This Year
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                        <div className="text-3xl font-bold text-white tracking-tight">
                            {formatCurrency(thisYearTotal)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-white/5 shadow-2xl backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardHeader className="flex flex-row items-center justify-between pt-6 px-6 pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-500" />
                            Total Setup Cost
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6">
                        <div className="text-3xl font-bold text-white tracking-tight">
                            {formatCurrency(setupTotal)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">All-time office setup</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-row items-center gap-3 mb-6 bg-card p-3 rounded-2xl border border-white/5 w-full shadow-lg shadow-black/20">
                <select
                    className="bg-white/5 border-none text-sm text-foreground h-10 rounded-xl px-4 outline-none appearance-none min-w-[150px]"
                    value={categoryFilter}
                    onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setPage(1);
                    }}
                >
                    <option value="all" className="bg-[#121217]">All Categories</option>
                    {OFFICE_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value} className="bg-[#121217]">{c.label}</option>
                    ))}
                </select>
                <div className="h-4 w-px bg-white/10"></div>
                <Suspense fallback={<div className="h-10 w-64 bg-white/5 rounded-xl animate-pulse" />}>
                    <MonthFilter />
                </Suspense>
            </div>

            {/* Data Table */}
            <div className="rounded-2xl border border-white/5 bg-card shadow-2xl overflow-x-auto custom-scrollbar">
                <Table className="min-w-[800px]">
                    <TableHeader className="bg-white/5 hover:bg-white/5">
                        <TableRow className="border-white/5">
                            <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider text-muted-foreground pl-6">Date</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Item</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Paid To</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Mode</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading expenses...</TableCell>
                            </TableRow>
                        ) : expensesData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No office expenses found for this period.</TableCell>
                            </TableRow>
                        ) : (
                            Object.entries(
                                expensesData.reduce((acc: any, item) => {
                                    const monthKey = format(new Date(item.date), "MMMM");
                                    if (!acc[monthKey]) acc[monthKey] = [];
                                    acc[monthKey].push(item);
                                    return acc;
                                }, {})
                            ).map(([month, items]: [string, any]) => (
                                <Blank key={month}>
                                    <TableRow className="bg-white/[0.02] border-white/5 pointer-events-none">
                                        <TableCell colSpan={7} className="py-2 pl-6">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/60 bg-orange-500/5 px-2 py-0.5 rounded-md border border-orange-500/10">
                                                    {month}
                                                </span>
                                                <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    {items.map((item: any) => (
                                        <TableRow key={item.id} className="border-white/5 hover:bg-white/5 group transition-colors">
                                            <TableCell className="font-medium text-foreground/80 pl-6 whitespace-nowrap">{format(new Date(item.date), "MMM dd, yyyy")}</TableCell>
                                            <TableCell className="font-semibold text-foreground">{item.description}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-white/5 text-zinc-400 border border-white/10 uppercase whitespace-nowrap">
                                                    {getCategoryLabel(item.category)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-foreground/80">{item.vendor || "-"}</TableCell>
                                            <TableCell className="text-foreground/80 uppercase text-xs">{item.payment_method}</TableCell>
                                            <TableCell className="text-right font-bold text-foreground">
                                                {formatCurrency(Number(item.amount))}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => setEditingExpense(item)}>
                                                        <Pencil size={14} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </Blank>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-8 border-white/10 bg-white/5 hover:bg-white/10"
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="h-8 border-white/10 bg-white/5 hover:bg-white/10"
                    >
                        Next
                    </Button>
                </div>
            </div>

            <EditOfficeExpenseDialog
                open={!!editingExpense}
                onOpenChange={(open) => !open && setEditingExpense(null)}
                expense={editingExpense}
                paymentMethods={paymentMethods}
                onSuccess={() => { fetchExpenses(); fetchMetrics(); }}
            />
        </div>
    );
}
