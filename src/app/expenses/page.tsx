"use client";

import { useState, useEffect, Fragment as Blank, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Pencil } from "lucide-react";
import { MonthFilter } from "@/components/ui/month-filter";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { EditExpenseDialog } from "@/components/expenses/edit-expense-dialog";

// Force dynamic rendering for this page due to useSearchParams in MonthFilter
export const dynamic = 'force-dynamic';

type ExpenseItem = {
    id: string;
    date: string;
    description: string;
    category: string;
    amount: number;
    payment_method: string;
    vendor: string;
    status: string;
};

export default function ExpensesPage() {
    const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

    // Pagination & Data State
    const [expensesData, setExpensesData] = useState<ExpenseItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [monthlyTotal, setMonthlyTotal] = useState(0); // Kept for future use if needed
    const ITEMS_PER_PAGE = 15;

    useEffect(() => {
        const fetchCategories = async () => {
            const { data } = await supabase.from('app_options').select('*').eq('group_name', 'expense_category');
            if (data) setCategoryOptions(data);
        };
        fetchCategories();

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

    // Fetch Data
    const fetchExpenses = async () => {
        setIsLoading(true);

        // Logical Source of Truth: URL Params
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
        const fromParam = params.get('from');
        const toParam = params.get('to');

        // Default to This Month if logic fails or params missing (though MonthFilter should handle it)
        const now = new Date();
        const from = fromParam ? new Date(fromParam) : startOfMonth(now);
        const toDate = toParam ? new Date(toParam) : endOfMonth(now);

        // Ensure valid dates
        if (isNaN(from.getTime()) || isNaN(toDate.getTime())) {
            setIsLoading(false);
            return;
        }

        const fromStr = format(from, 'yyyy-MM-dd');
        const toStr = format(toDate, 'yyyy-MM-dd');

        const offset = (page - 1) * ITEMS_PER_PAGE;
        const limit = offset + ITEMS_PER_PAGE - 1;

        // Get count with search filter
        let countQuery = supabase
            .from('expenses')
            .select('*', { count: 'exact', head: true })
            .gte('date', fromStr)
            .lte('date', toStr);

        if (searchTerm.trim()) {
            const searchPattern = `%${searchTerm.trim()}%`;
            countQuery = countQuery.or(`vendor.ilike.${searchPattern},category.ilike.${searchPattern}`);
        }

        const { count } = await countQuery;

        if (count !== null) setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));

        // Get total amount for the period with search filter
        let totalQuery = supabase
            .from('expenses')
            .select('amount')
            .gte('date', fromStr)
            .lte('date', toStr);

        if (searchTerm.trim()) {
            const searchPattern = `%${searchTerm.trim()}%`;
            totalQuery = totalQuery.or(`vendor.ilike.${searchPattern},category.ilike.${searchPattern}`);
        }

        const { data: totalData } = await totalQuery;

        const total = totalData?.reduce((s, i) => s + Number(i.amount), 0) || 0;
        setMonthlyTotal(total);

        // Get data with search filter
        let dataQuery = supabase
            .from('expenses')
            .select('*')
            .gte('date', fromStr)
            .lte('date', toStr);

        if (searchTerm.trim()) {
            const searchPattern = `%${searchTerm.trim()}%`;
            dataQuery = dataQuery.or(`vendor.ilike.${searchPattern},category.ilike.${searchPattern}`);
        }

        const { data, error } = await dataQuery
            .order('date', { ascending: false })
            .range(offset, limit);

        if (data) {
            const formatted = data.map((item: any) => ({
                id: item.id,
                date: item.date,
                description: item.description,
                category: item.category || "General",
                amount: Number(item.amount),
                payment_method: item.payment_method,
                vendor: item.vendor || item.description || "Unknown",
                service: item.service || "Expense",
                status: item.status || "PAID"
            }));
            setExpensesData(formatted);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchExpenses();

        // Subscribe to changes for real-time syncing
        const subscription = supabase
            .channel('public:expenses')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, fetchExpenses)
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [page, searchTerm]);


    // Filter
    const filteredExpenses = expensesData.filter((item) =>
        item.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Expenses</h1>
                    <p className="text-muted-foreground mt-1">Track operational costs and expenses.</p>
                </div>
                <AddExpenseDialog
                    categoryOptions={categoryOptions}
                    paymentMethods={paymentMethods}
                    onSuccess={fetchExpenses}
                />
            </div>

            <div className="flex items-center justify-between gap-4 mb-6 bg-card p-3 rounded-2xl border border-white/5 w-full shadow-lg shadow-black/20">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search expenses..."
                            className="pl-9 bg-white/5 border-none w-64 focus-visible:ring-1 focus-visible:ring-orange-500/20 h-10 rounded-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="h-4 w-px bg-white/10 hidden md:block"></div>
                    <Suspense fallback={<div className="h-10 w-64 bg-white/5 rounded-xl animate-pulse" />}>
                        <MonthFilter />
                    </Suspense>
                </div>
            </div>

            {/* Data Table */}
            <div className="rounded-2xl border border-white/5 bg-card overflow-hidden shadow-2xl">
                <Table>
                    <TableHeader className="bg-white/5 hover:bg-white/5">
                        <TableRow className="border-white/5">
                            <TableHead className="w-[150px] text-xs font-bold uppercase tracking-wider text-muted-foreground pl-6">Date</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Merchant</TableHead>
                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</TableHead>
                            <TableHead className="w-[100px] text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Loading...</TableCell>
                            </TableRow>
                        ) : filteredExpenses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No records found.</TableCell>
                            </TableRow>
                        ) : (
                            Object.entries(
                                filteredExpenses.reduce((acc: any, item) => {
                                    const monthKey = format(new Date(item.date), "MMMM");
                                    if (!acc[monthKey]) acc[monthKey] = [];
                                    acc[monthKey].push(item);
                                    return acc;
                                }, {})
                            ).map(([month, items]: [string, any]) => (
                                <Blank key={month}>
                                    {/* Monthly Header Row */}
                                    <TableRow className="bg-white/[0.02] border-white/5 pointer-events-none">
                                        <TableCell colSpan={6} className="py-2 pl-6">
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
                                            <TableCell className="font-medium text-foreground/80 pl-6">{format(new Date(item.date), "MMM dd")}</TableCell>
                                            <TableCell className="font-semibold text-foreground">{item.vendor}</TableCell>
                                            <TableCell><CategoryPill category={item.category} /></TableCell>
                                            <TableCell className="text-right">
                                                <span className={`text-[10px] font-bold ${item.status === 'PAID' ? 'text-emerald-500' : 'text-amber-500'}`}>{item.status}</span>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-foreground">
                                                ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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

            <EditExpenseDialog
                open={!!editingExpense}
                onOpenChange={(open) => !open && setEditingExpense(null)}
                expense={editingExpense}
                categoryOptions={categoryOptions}
                paymentMethods={paymentMethods}
                onSuccess={fetchExpenses}
            />
        </div>
    );
}

function CategoryPill({ category }: { category: string }) {
    return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold bg-white/5 text-zinc-400 border border-white/10 uppercase">
            {category}
        </span>
    )
}
