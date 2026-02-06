"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { supabase } from "@/lib/supabase";

type ChartData = {
    name: string;
    income: number;
    expense: number;
};

interface IncomeExpenseBarChartProps {
    from?: Date;
    to?: Date;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#141416] border border-white/10 p-3 rounded-xl shadow-2xl">
                <p className="text-zinc-500 text-[10px] mb-1 uppercase tracking-wider font-bold">{label}</p>
                <div className="space-y-1">
                    <p className="text-white text-xs font-bold">
                        In: ₹{payload[0].value.toLocaleString()}
                    </p>
                    <p className="text-zinc-400 text-xs font-bold">
                        Out: ₹{payload[1].value.toLocaleString()}
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export function IncomeExpenseBarChart({ from, to }: IncomeExpenseBarChartProps) {
    const [data, setData] = useState<ChartData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Determine Date Range
                let startDate: Date;
                let endDate: Date;

                if (from && to) {
                    startDate = from;
                    endDate = to;
                } else {
                    // Default to Last 12 Months
                    const today = new Date();
                    startDate = startOfMonth(subMonths(today, 11));
                    endDate = endOfMonth(today);
                }

                const startStr = format(startDate, 'yyyy-MM-dd');
                const endStr = format(endDate, 'yyyy-MM-dd');

                // 1. Fetch Income
                const { data: incomeData } = await supabase
                    .from('income')
                    .select('amount, date')
                    .gte('date', startStr)
                    .lte('date', endStr)
                    .eq('status', 'RECEIVED');

                // 2. Fetch Expenses
                const { data: expenseData } = await supabase
                    .from('expenses')
                    .select('amount, date')
                    .gte('date', startStr)
                    .lte('date', endStr)
                    .eq('status', 'PAID');

                // 3. Aggregate Data by Month
                const monthlyData = new Map<string, { income: number; expense: number }>();

                // Generate all months in interval
                try {
                    const months = eachMonthOfInterval({
                        start: startOfMonth(startDate),
                        end: endOfMonth(endDate)
                    });

                    months.forEach(date => {
                        const key = format(date, "MMM yyyy");
                        monthlyData.set(key, { income: 0, expense: 0 });
                    });
                } catch (e) {
                    // Fallback if interval is invalid
                    console.error("Invalid interval for chart:", e);
                }

                // Sum Income
                incomeData?.forEach((item) => {
                    const month = format(new Date(item.date), "MMM yyyy");
                    if (monthlyData.has(month)) {
                        const current = monthlyData.get(month)!;
                        monthlyData.set(month, { ...current, income: current.income + Number(item.amount) });
                    }
                });

                // Sum Expenses
                expenseData?.forEach((item) => {
                    const month = format(new Date(item.date), "MMM yyyy");
                    if (monthlyData.has(month)) {
                        const current = monthlyData.get(month)!;
                        monthlyData.set(month, { ...current, expense: current.expense + Number(item.amount) });
                    }
                });

                // Convert Map to Array
                const chartData = Array.from(monthlyData.entries()).map(([name, values]) => ({
                    name,
                    income: values.income,
                    expense: values.expense,
                }));

                setData(chartData);

            } catch (error) {
                // Error fetching chart data - silently fail in production
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [from, to]);

    if (isLoading) {
        return <div className="h-full w-full flex items-center justify-center text-xs text-zinc-600">Loading chart...</div>;
    }

    // Fallback if no data is found (empty chart looks bad)
    const displayData = data.some(d => d.income > 0 || d.expense > 0) ? data : [
        { name: "No Data", income: 0, expense: 0 }
    ];

    return (
        <div className="h-full w-full min-h-[250px] p-2">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={displayData}
                    barSize={45}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#666"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#a1a1aa' }}
                        dy={10}
                    />
                    <YAxis
                        stroke="#666"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#a1a1aa' }}
                        tickFormatter={(value) => `₹${value / 1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar
                        dataKey="income"
                        name="Income"
                        fill="#f97316" // Orange
                        radius={[4, 4, 0, 0]}
                    />
                    <Bar
                        dataKey="expense"
                        name="Expense"
                        fill="#27272a" // Zinc
                        radius={[4, 4, 0, 0]}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
