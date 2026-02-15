"use client";

import { useState, useEffect, Fragment as Blank, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, IndianRupee, BarChart3 } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { MonthFilter } from "@/components/ui/month-filter";
import { startOfMonth, endOfMonth, format, isSameMonth } from "date-fns";
import { ServiceSelector } from "@/components/ui/service-selector";
import { ClientSelector } from "@/components/ui/client-selector";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RevenueTrendsDialog } from "@/components/income/revenue-trends-dialog";

// Force dynamic rendering for this page due to useSearchParams in MonthFilter
export const dynamic = 'force-dynamic';

type IncomeItem = {
    id: string;
    date: string;
    client: string;
    category: string;
    service_id: string | null;
    service_name?: string;
    amount: number;
    description: string;
    status: string;
    payment_method?: string;
};

// Hover Tooltip using Popover
function ProjectDetailPopover({ description }: { description: string }) {
    const [open, setOpen] = useState(false);

    if (!description) return <span className="text-muted-foreground">-</span>;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div
                    onMouseEnter={() => setOpen(true)}
                    onMouseLeave={() => setOpen(false)}
                    className="cursor-help w-full"
                >
                    <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                        {description}
                    </span>
                </div>
            </PopoverTrigger>
            <PopoverContent
                className="w-auto max-w-[300px] p-2 text-xs bg-[#1A1A1A] border-white/10 text-zinc-300 pointer-events-none shadow-xl z-50"
                side="top"
                align="start"
            >
                {description}
            </PopoverContent>
        </Popover>
    );
}

export default function IncomePage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTrendsOpen, setIsTrendsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentId, setCurrentId] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        client: "", // Legacy text fallback
        client_id: null as string | null,
        client_name: "",
        category: "General",
        service_id: null as string | null,
        service_name: "",
        amount: "",
        description: "",
        date: new Date(),
        status: "RECEIVED",
        payment_method: "bank"
    });

    // Data State
    const [incomeData, setIncomeData] = useState<IncomeItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [monthlyTotal, setMonthlyTotal] = useState(0);
    const ITEMS_PER_PAGE = 15;

    // Derived Date Range from URL (Single Source of Truth)
    // Using useEffect to read URL params on client side instead of useSearchParams
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
        const now = new Date();
        return { from: startOfMonth(now), to: endOfMonth(now) };
    });

    useEffect(() => {
        const updateDateRangeFromURL = () => {
            if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search);
                const fromParam = params.get('from');
                const toParam = params.get('to');
                if (fromParam && toParam) {
                    const newFrom = new Date(fromParam);
                    const newTo = new Date(toParam);
                    // Only update if different to avoid infinite loops
                    if (newFrom.getTime() !== dateRange.from.getTime() || newTo.getTime() !== dateRange.to.getTime()) {
                        setDateRange({ from: newFrom, to: newTo });
                    }
                }
            }
        };

        // Poll for URL changes every 300ms
        const interval = setInterval(updateDateRangeFromURL, 300);

        return () => clearInterval(interval);
    }, [dateRange]);

    const [paymentMethods, setPaymentMethods] = useState<{ label: string, value: string }[]>([]);

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

    const getRange = () => dateRange;

    const fetchIncome = async () => {
        setIsLoading(true);
        const { from, to: toDate } = getRange();

        // Ensure valid dates
        if (isNaN(from.getTime()) || isNaN(toDate.getTime())) {
            setIsLoading(false);
            return;
        }

        const fromStr = format(from, 'yyyy-MM-dd');
        const toStr = format(toDate, 'yyyy-MM-dd');

        const offset = (page - 1) * ITEMS_PER_PAGE;
        const limit = offset + ITEMS_PER_PAGE - 1;

        // Get count with search filter (Strictly RECEIVED)
        let countQuery = supabase
            .from('income')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'RECEIVED')
            .gte('date', fromStr)
            .lte('date', toStr);

        if (searchTerm.trim()) {
            const searchPattern = `%${searchTerm.trim()}%`;
            countQuery = countQuery.or(`client.ilike.${searchPattern},description.ilike.${searchPattern},category.ilike.${searchPattern}`);
        }

        const { count } = await countQuery;

        if (count !== null) setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));

        // Get total amount for the period with search filter (Strictly RECEIVED)
        let totalQuery = supabase
            .from('income')
            .select('amount')
            .eq('status', 'RECEIVED')
            .gte('date', fromStr)
            .lte('date', toStr);

        if (searchTerm.trim()) {
            const searchPattern = `%${searchTerm.trim()}%`;
            totalQuery = totalQuery.or(`client.ilike.${searchPattern},description.ilike.${searchPattern},category.ilike.${searchPattern}`);
        }

        const { data: totalData } = await totalQuery;

        const total = totalData?.reduce((s, i) => s + Number(i.amount), 0) || 0;
        setMonthlyTotal(total);

        // Get data with search filter (Strictly RECEIVED)
        let dataQuery = supabase
            .from('income')
            .select('*, services(name), clients(name)')
            .eq('status', 'RECEIVED')
            .gte('date', fromStr)
            .lte('date', toStr);

        if (searchTerm.trim()) {
            const searchPattern = `%${searchTerm.trim()}%`;
            dataQuery = dataQuery.or(`client.ilike.${searchPattern},description.ilike.${searchPattern},category.ilike.${searchPattern}`);
        }

        const isCurrentMonth = isSameMonth(new Date(), from);

        const { data, error } = await dataQuery
            .order('date', { ascending: !isCurrentMonth })
            .range(offset, limit);

        if (data) {
            const formatted = data.map((item: any) => {
                let clientName = "Unknown";

                // Helper to safely get client name from relation
                const joinedClient = Array.isArray(item.clients) ? item.clients[0] : item.clients;

                if (item.client_id && joinedClient?.name) {
                    clientName = joinedClient.name;
                } else if (item.description && item.description.includes(":")) {
                    // Legacy fallback
                    clientName = item.description.split(":")[0].trim();
                } else {
                    clientName = "General Client";
                }
                return {
                    id: item.id,
                    date: item.date,
                    client: clientName,
                    category: item.category || "General",
                    service_id: item.service_id,
                    client_id: item.client_id,
                    service_name: item.services?.name,
                    amount: Number(item.amount),
                    description: item.description,
                    status: item.status || "RECEIVED",
                    payment_method: item.payment_method
                };
            });
            setIncomeData(formatted);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchIncome();

        const subscription = supabase
            .channel('public:income')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'income' }, fetchIncome)
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [page, searchTerm, dateRange]);

    // Open Add
    const openAddModal = () => {
        setIsEditing(false);
        setFormData({
            client: "",
            client_id: null,
            client_name: "",
            category: "General",
            service_id: null,
            service_name: "",
            amount: "",
            description: "",
            date: new Date(),
            status: "RECEIVED",
            payment_method: "bank"
        });
        setIsModalOpen(true);
    };

    // Open Edit
    const openEditModal = (item: IncomeItem) => {
        setIsEditing(true);
        setCurrentId(item.id);
        setFormData({
            client: item.client,
            client_id: (item as any).client_id, // Cast because I didn't update the type definition in top of file yet, safer to cast or use any.
            client_name: item.client,
            category: item.category,
            service_id: item.service_id, // This matches
            service_name: item.service_name || "",
            amount: item.amount.toString(),
            description: item.description || "",
            date: new Date(item.date),
            status: item.status,
            payment_method: item.payment_method || "bank"
        });
        setIsModalOpen(true);
    };

    // Handle Delete
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this income record?")) return;

        const { error } = await supabase
            .from('income')
            .delete()
            .eq('id', id);

        if (error) {
            alert("Error deleting: " + error.message);
        } else {
            setIsModalOpen(false);
            fetchIncome();
        }
    };

    // Handle Save
    const handleSave = async () => {
        setIsSubmitting(true);
        // Sanitize and validate amount
        const cleanAmount = formData.amount.replace(/[^0-9.]/g, '');
        const amountVal = parseFloat(cleanAmount);

        if (isNaN(amountVal) || amountVal <= 0) {
            alert("Please enter a valid amount");
            setIsSubmitting(false);
            return;
        }

        if (!formData.client.trim()) {
            alert("Please enter a client name");
            setIsSubmitting(false);
            return;
        }

        if (!formData.service_id) {
            alert("Please select a service category");
            setIsSubmitting(false);
            return;
        }

        const payload = {
            date: format(formData.date, "yyyy-MM-dd"),
            description: formData.description,
            category: formData.service_name || "General", // Use service name as category text backup
            service_id: formData.service_id,
            client_id: formData.client_id,
            amount: amountVal,
            status: formData.status,
            payment_method: formData.payment_method
        };

        let error;
        try {
            if (isEditing && currentId) {
                const { error: err } = await supabase
                    .from('income')
                    .update(payload)
                    .eq('id', currentId);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('income')
                    .insert([payload]);
                error = err;
            }

            if (error) throw error;

            setIsModalOpen(false);
            fetchIncome();
        } catch (err: any) {
            // Error saving income - show user-friendly message
            alert("Error saving: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter
    const filteredIncome = incomeData.filter((item) =>
        item.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.service_name || item.category).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Income</h1>
                    <p className="text-muted-foreground mt-1">Manage revenue streams and invoices.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setIsTrendsOpen(true)}
                        className="rounded-full border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white px-5 font-medium flex items-center gap-2"
                    >
                        <BarChart3 size={16} />
                        View Revenue Trends
                    </Button>
                    <Button onClick={openAddModal} className="rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/20 px-6 font-semibold">
                        <Plus size={18} className="mr-2" /> Add Income
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between gap-4 mb-6 bg-card p-3 rounded-2xl border border-white/5 w-full shadow-lg shadow-black/20">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search income..."
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
                            <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap pl-4">Date</TableHead>
                            <TableHead className="w-[20%] text-xs font-bold uppercase tracking-wider text-muted-foreground">Client</TableHead>
                            <TableHead className="w-[25%] text-xs font-bold uppercase tracking-wider text-muted-foreground">Project Details</TableHead>
                            <TableHead className="w-[15%] text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                            <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-muted-foreground w-[120px]">Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Loading...</TableCell>
                            </TableRow>
                        ) : filteredIncome.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No records found.</TableCell>
                            </TableRow>
                        ) : (
                            Object.entries(
                                filteredIncome.reduce((acc: any, item) => {
                                    const monthKey = format(new Date(item.date), "MMMM");
                                    if (!acc[monthKey]) acc[monthKey] = [];
                                    acc[monthKey].push(item);
                                    return acc;
                                }, {})
                            ).map(([month, items]: [string, any]) => (
                                <Blank key={month}>
                                    {/* Monthly Header Row */}
                                    <TableRow className="bg-white/[0.02] border-white/5 pointer-events-none">
                                        <TableCell colSpan={7} className="py-3 pl-4">
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
                                            <TableCell className="font-medium text-foreground/80 whitespace-nowrap pl-4">{format(new Date(item.date), "MMM dd, yyyy")}</TableCell>
                                            <TableCell>
                                                <span className="font-semibold text-foreground text-sm">{item.client}</span>
                                            </TableCell>
                                            <TableCell>
                                                <ProjectDetailPopover description={item.description} />
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-white/5 text-muted-foreground border border-white/10 px-2.5 py-0.5 rounded-md text-[11px] font-medium whitespace-nowrap">
                                                    {item.service_name || item.category}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-foreground font-mono tracking-tight">
                                                ₹{item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge className={cn(
                                                    "px-2.5 py-0.5 rounded-full text-[11px] font-semibold border-0",
                                                    item.status === 'RECEIVED' ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20' : 'bg-amber-500/15 text-amber-500 hover:bg-amber-500/20'
                                                )}>
                                                    {item.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white" onClick={() => openEditModal(item)}>
                                                    <Pencil size={14} />
                                                </Button>
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

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[425px] p-0 gap-0 outline-none">
                    <DialogHeader className="p-6 pb-2 space-y-1">
                        <DialogTitle>{isEditing ? "Edit Income" : "Add Income"}</DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-7 px-6 py-4">
                        <div className="grid gap-2">
                            <Label>Client Name</Label>
                            <ClientSelector
                                value={formData.client_id}
                                onChange={(id, name) => setFormData({ ...formData, client_id: id, client_name: name, client: name })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label>Amount</Label>
                                <div className="relative">
                                    <IndianRupee size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                    <Input
                                        type="number"
                                        className="bg-white/5 border-white/10 pl-9 h-10 text-white focus-visible:ring-1 focus-visible:ring-emerald-500/20"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Date</Label>
                                <DatePicker
                                    date={formData.date}
                                    setDate={(d) => d && setFormData({ ...formData, date: d })}
                                    className="bg-white/5 border-white/10 h-10 text-white hover:bg-zinc-900 w-full"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Project Details <span className="text-zinc-500 text-xs font-normal ml-1">(Optional)</span></Label>
                            <Input
                                className="bg-white/5 border-white/10 text-white focus-visible:ring-1 focus-visible:ring-emerald-500/20"
                                placeholder="E.g. Website Redesign - Milestone 1"
                                value={formData.description}
                                onChange={(e) => {
                                    if (e.target.value.length <= 50) {
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                }}
                            />
                            <p className="text-[10px] text-muted-foreground text-right">{formData.description.length}/50</p>
                        </div>

                        <div className="grid gap-2">
                            <Label>Service Category <span className="text-red-500">*</span></Label>
                            <ServiceSelector
                                value={formData.service_id}
                                onChange={(id, name) => setFormData({ ...formData, service_id: id, service_name: name })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Payment Method</Label>
                            <Select
                                value={formData.payment_method}
                                onValueChange={(val) => setFormData({ ...formData, payment_method: val })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
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

                    <div className="flex justify-between items-center px-6 py-5 border-t border-white/5 mt-6">
                        {isEditing ? (
                            <Button
                                variant="ghost"
                                onClick={() => handleDelete(currentId!)}
                                className="h-11 text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 rounded-xl flex items-center gap-2 transition-colors"
                            >
                                <Trash2 size={18} />
                                <span className="font-medium">Delete</span>
                            </Button>
                        ) : (
                            <div></div>
                        )}
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => setIsModalOpen(false)}
                                className="h-11 text-zinc-400 hover:text-white hover:bg-white/5 px-6 rounded-xl font-medium transition-colors"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className="h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold shadow-lg shadow-orange-500/20 px-8 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {isSubmitting ? "Saving..." : "Save Entry"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <RevenueTrendsDialog
                open={isTrendsOpen}
                onOpenChange={setIsTrendsOpen}
                dateRange={dateRange}
            />
        </div >
    );
}
