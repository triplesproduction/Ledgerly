"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, PieChart, TrendingUp, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ExpensePieChart } from "@/components/charts/expense-pie-chart";
import { NetProfitLineChart } from "@/components/charts/net-profit-line-chart";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";

// Analytics Components
import { SourceBreakdown } from "@/components/analytics/source-breakdown";
import { CashflowRunway } from "@/components/analytics/cashflow-runway";
import { OutstandingTracker } from "@/components/analytics/outstanding-tracker";
import { ProfitMarginTrend } from "@/components/analytics/profit-margin-trend";

export default function ReportsPage() {
    const [expenseData, setExpenseData] = useState<any[]>([]);
    const [profitData, setProfitData] = useState<any[]>([]);

    // New Data States
    const [rawIncome, setRawIncome] = useState<any[]>([]);
    const [rawExpenses, setRawExpenses] = useState<any[]>([]);
    const [totalLiquidity, setTotalLiquidity] = useState(0);

    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("12m");

    // Statement Download Filters
    const currentDate = new Date();
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState((currentDate.getMonth() + 1).toString().padStart(2, '0'));

    const fetchReportData = async (range: string) => {
        setLoading(true);
        const today = new Date();
        let reportStart = "";
        let reportEnd = format(endOfMonth(today), 'yyyy-MM-dd');

        if (range === "12m") {
            reportStart = format(startOfMonth(subMonths(today, 11)), 'yyyy-MM-dd');
        } else if (range === "6m") {
            reportStart = format(startOfMonth(subMonths(today, 5)), 'yyyy-MM-dd');
        } else if (range === "3m") {
            reportStart = format(startOfMonth(subMonths(today, 2)), 'yyyy-MM-dd');
        } else if (range === "ytd") {
            reportStart = format(startOfMonth(new Date(today.getFullYear(), 0, 1)), 'yyyy-MM-dd');
        }

        // 1. Fetch Expenses (Expanded fields for Analytics)
        const { data: expenses } = await supabase
            .from('expenses')
            .select('amount, category, date, status')
            .gte('date', reportStart)
            .lte('date', reportEnd)
            .neq('status', 'SCHEDULED');

        // 2. Fetch Income (Expanded fields for Analytics)
        const { data: income } = await supabase
            .from('income')
            .select('amount, date, status, category, service_id, description, client:clients(name)')
            .gte('date', reportStart)
            .lte('date', reportEnd);

        // 3. Fetch Total Liquidity (All Time) for Runway
        const { data: allIncome } = await supabase.from('income').select('amount').eq('status', 'RECEIVED');
        const { data: allExpense } = await supabase.from('expenses').select('amount').eq('status', 'PAID');

        const totalInc = allIncome?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
        const totalExp = allExpense?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
        setTotalLiquidity(totalInc - totalExp);

        if (expenses && income) {
            // Flatten Income for ease of use
            const processedIncome = income.map((item: any) => ({
                ...item,
                client_name: item.client instanceof Array ? item.client[0]?.name : item.client?.name || (item.description?.includes(':') ? item.description.split(':')[0] : 'General'),
            }));

            setRawIncome(processedIncome);
            setRawExpenses(expenses);

            // -- Process Pie Chart (Expenses by Category) --
            const categoryMap: Record<string, number> = {};
            expenses.forEach((exp: any) => {
                const cat = exp.category || "Uncategorized";
                categoryMap[cat] = (categoryMap[cat] || 0) + Number(exp.amount);
            });

            // Colors for Pie Chart
            const COLORS = ["#f97316", "#ea580c", "#c2410c", "#3f3f46", "#27272a", "#71717a"];
            const pieData = Object.entries(categoryMap).map(([name, value], index) => ({
                name,
                value,
                color: COLORS[index % COLORS.length]
            })).sort((a, b) => b.value - a.value);

            setExpenseData(pieData);

            // -- Process Line Chart (Monthly Profit) --
            const monthlyStats: Record<string, { income: number, expense: number }> = {};
            const getMonthKey = (dateStr: string) => format(parseISO(dateStr), "MMM");

            // Only count RECEIVED/PAID for the "Realized Profit" chart
            processedIncome.forEach((inc: any) => {
                if (inc.status !== 'RECEIVED') return;
                const m = getMonthKey(inc.date);
                if (!monthlyStats[m]) monthlyStats[m] = { income: 0, expense: 0 };
                monthlyStats[m].income += Number(inc.amount);
            });

            expenses.forEach((exp: any) => {
                if (exp.status !== 'PAID') return;
                const m = getMonthKey(exp.date);
                if (!monthlyStats[m]) monthlyStats[m] = { income: 0, expense: 0 };
                monthlyStats[m].expense += Number(exp.amount);
            });

            const monthsOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const lineData = monthsOrder.map(m => ({
                name: m,
                profit: (monthlyStats[m]?.income || 0) - (monthlyStats[m]?.expense || 0)
            })).filter(d => monthlyStats[d.name] !== undefined);

            setProfitData(lineData);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchReportData(dateRange);
    }, [dateRange]);

    const handleDownload = (reportName: string) => {
        const fileName = reportName.toLowerCase().replace(/\s+/g, '-') + ".pdf";
        alert(`Downloading ${fileName}...`);
    };

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Reports & Analytics</h1>
                    <p className="text-muted-foreground mt-1">Financial statements, P&L breakdown, and deep-dive insights.</p>
                </div>

                <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[160px] border-white/10 bg-[#0e0e11] text-white text-[11px] font-medium h-9">
                        <Calendar className="mr-2 h-3.5 w-3.5 text-orange-500" />
                        <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#16171D] border-white/10 text-white">
                        <SelectItem value="12m" className="text-xs">Last 12 Months</SelectItem>
                        <SelectItem value="6m" className="text-xs">Last 6 Months</SelectItem>
                        <SelectItem value="3m" className="text-xs">Last 90 Days</SelectItem>
                        <SelectItem value="ytd" className="text-xs">This Fiscal Year</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* --- Core KPI Charts --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <Card className="bg-[#0e0e11] border-white/5 shadow-lg relative overflow-hidden">
                    <CardHeader className="pt-6 px-6 pb-2">
                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                            <PieChart size={16} className="text-orange-500" /> Expense Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-zinc-500 text-xs">Loading data...</div>
                        ) : (
                            <ExpensePieChart data={expenseData} />
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-[#0e0e11] border-white/5 shadow-lg relative overflow-hidden">
                    <CardHeader className="pt-6 px-6 pb-2">
                        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                            <TrendingUp size={16} className="text-orange-500" /> Net Profit Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] w-full p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-zinc-500 text-xs">Loading data...</div>
                        ) : (
                            <NetProfitLineChart data={profitData} />
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* --- Advanced Analytics Section --- */}
            <div className="space-y-8 mb-10">
                <div className="flex items-center gap-4">
                    <div className="h-px bg-white/10 flex-1"></div>
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Business Intelligence</span>
                    <div className="h-px bg-white/10 flex-1"></div>
                </div>

                {loading ? (
                    <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">Loading analytics...</div>
                ) : (
                    <>
                        <CashflowRunway income={rawIncome} expenses={rawExpenses} totalLiquidity={totalLiquidity} />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <OutstandingTracker income={rawIncome} />
                            <ProfitMarginTrend income={rawIncome} expenses={rawExpenses} />
                        </div>

                        <SourceBreakdown data={rawIncome} />
                    </>
                )}
            </div>

            {/* --- Download Statements Section --- */}
            <div className="rounded-2xl border border-white/5 bg-card overflow-hidden shadow-lg">
                <div className="p-6 pb-4 border-b border-white/5">
                    <h3 className="font-bold text-foreground mb-1">Download Financial Statements</h3>
                    <p className="text-sm text-muted-foreground">Generate and download monthly financial reports</p>
                </div>
                <div className="p-6 space-y-4">
                    {/* Year and Month Selectors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Year Selector */}
                        <div>
                            <label className="text-muted-foreground text-xs mb-2 block">Select Year</label>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-11 text-white font-medium">
                                    <SelectValue placeholder="Select year" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white z-[200]">
                                    {Array.from({ length: 5 }, (_, i) => {
                                        const year = (currentDate.getFullYear() - i).toString();
                                        return <SelectItem key={year} value={year}>{year}</SelectItem>;
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Month Selector */}
                        <div>
                            <label className="text-muted-foreground text-xs mb-2 block">Select Month</label>
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-11 text-white font-medium">
                                    <SelectValue placeholder="Select month" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-white/10 text-white z-[200]">
                                    <SelectItem value="01">January</SelectItem>
                                    <SelectItem value="02">February</SelectItem>
                                    <SelectItem value="03">March</SelectItem>
                                    <SelectItem value="04">April</SelectItem>
                                    <SelectItem value="05">May</SelectItem>
                                    <SelectItem value="06">June</SelectItem>
                                    <SelectItem value="07">July</SelectItem>
                                    <SelectItem value="08">August</SelectItem>
                                    <SelectItem value="09">September</SelectItem>
                                    <SelectItem value="10">October</SelectItem>
                                    <SelectItem value="11">November</SelectItem>
                                    <SelectItem value="12">December</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Statement Types */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        {/* P&L Statement */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-orange-500/30 transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-orange-500" />
                                </div>
                                <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 text-[10px] font-bold">PDF</Badge>
                            </div>
                            <h4 className="font-bold text-white mb-1">P&L Statement</h4>
                            <p className="text-xs text-zinc-500 mb-4">Income vs Expenses breakdown with net profit</p>
                            <Button
                                onClick={() => {
                                    const monthName = format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy');
                                    alert(`P&L Statement for ${monthName} will be downloaded when implemented`);
                                }}
                                className="w-full h-9 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg"
                            >
                                <Download size={14} className="mr-2" />
                                Download
                            </Button>
                        </div>

                        {/* Income Report */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-green-500/30 transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-green-500" />
                                </div>
                                <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[10px] font-bold">PDF</Badge>
                            </div>
                            <h4 className="font-bold text-white mb-1">Income Report</h4>
                            <p className="text-xs text-zinc-500 mb-4">Detailed income transactions and receivables</p>
                            <Button
                                onClick={() => {
                                    const monthName = format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy');
                                    alert(`Income Report for ${monthName} will be downloaded when implemented`);
                                }}
                                className="w-full h-9 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg"
                            >
                                <Download size={14} className="mr-2" />
                                Download
                            </Button>
                        </div>

                        {/* Expense Report */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-red-500/30 transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                    <PieChart className="w-5 h-5 text-red-500" />
                                </div>
                                <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-[10px] font-bold">PDF</Badge>
                            </div>
                            <h4 className="font-bold text-white mb-1">Expense Report</h4>
                            <p className="text-xs text-zinc-500 mb-4">Complete expense audit with categories</p>
                            <Button
                                onClick={() => {
                                    const monthName = format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy');
                                    alert(`Expense Report for ${monthName} will be downloaded when implemented`);
                                }}
                                className="w-full h-9 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg"
                            >
                                <Download size={14} className="mr-2" />
                                Download
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
