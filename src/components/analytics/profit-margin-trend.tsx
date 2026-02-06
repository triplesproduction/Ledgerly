"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";

interface ProfitMarginTrendProps {
    income: any[];
    expenses: any[];
}

export function ProfitMarginTrend({ income, expenses }: ProfitMarginTrendProps) {
    const monthlyStats: Record<string, { date: Date, revenue: number, expense: number }> = {};
    const getMonthKey = (dateStr: string) => format(parseISO(dateStr), "yyyy-MM");

    // Aggregate Income (Revenue) - Only Received
    income.forEach(item => {
        if (item.status !== "RECEIVED") return;
        const key = getMonthKey(item.date);
        if (!monthlyStats[key]) monthlyStats[key] = { date: new Date(item.date), revenue: 0, expense: 0 };
        monthlyStats[key].revenue += Number(item.amount);
    });

    // Aggregate Expenses - Only Paid
    expenses.forEach(item => {
        if (item.status !== "PAID") return;
        const key = getMonthKey(item.date);
        if (!monthlyStats[key]) monthlyStats[key] = { date: new Date(item.date), revenue: 0, expense: 0 };
        monthlyStats[key].expense += Number(item.amount);
    });

    const chartData = Object.entries(monthlyStats)
        .map(([key, val]) => {
            const netProfit = val.revenue - val.expense;
            const margin = val.revenue > 0 ? (netProfit / val.revenue) * 100 : 0;
            return {
                name: format(val.date, "MMM"),
                fullDate: key,
                Revenue: val.revenue,
                NetProfit: netProfit,
                Margin: parseFloat(margin.toFixed(1))
            };
        })
        .sort((a, b) => a.fullDate.localeCompare(b.fullDate))
        .slice(-12); // Last 12 months

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-card border border-white/10 p-4 rounded-xl shadow-xl backdrop-blur-md min-w-[160px]">
                    <p className="text-zinc-500 text-[10px] mb-3 font-bold uppercase tracking-wider">{label}</p>
                    <div className="space-y-2">
                        {/* Revenue = Dark Grey (Background context) */}
                        <div className="flex justify-between text-xs items-center">
                            <span className="text-zinc-500 font-medium">Revenue</span>
                            <span className="font-mono text-zinc-400 font-bold">₹{payload[0].value.toLocaleString()}</span>
                        </div>
                        {/* Net Profit = Orange (Focus) */}
                        <div className="flex justify-between text-xs items-center">
                            <span className="text-[#FF5500] font-medium">Net Profit</span>
                            <span className="font-mono text-[#FF5500] font-bold">₹{payload[1].value.toLocaleString()}</span>
                        </div>
                        {/* Margin = White (Overlay) */}
                        <div className="border-t border-white/10 pt-2 flex justify-between text-xs items-center">
                            <span className="text-white font-medium">Margin</span>
                            <span className="font-mono font-bold text-white">{payload[2].value}%</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="bg-card border-white/5 shadow-xl">
            <CardHeader className="p-8 pb-4">
                <CardTitle className="text-sm font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-wider">
                    <TrendingUp size={14} className="text-[#FF5500]" /> Profitability & Efficiency Trend
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] p-8 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#71717a"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                            fontFamily="var(--font-montserrat)"
                        />
                        <YAxis
                            yAxisId="left"
                            stroke="#71717a"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `₹${val / 1000}k`}
                            fontFamily="var(--font-montserrat)"
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#FFFFFF"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `${val}%`}
                            fontFamily="var(--font-montserrat)"
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontFamily: 'var(--font-montserrat)' }}
                            formatter={(value) => <span className="text-zinc-500 font-medium ml-1">{value}</span>}
                        />

                        {/* Revenue = Dark Grey */}
                        <Bar yAxisId="left" dataKey="Revenue" fill="#27272a" radius={[4, 4, 0, 0]} barSize={24} />
                        {/* Net Profit = Orange */}
                        <Bar yAxisId="left" dataKey="NetProfit" fill="#FF5500" radius={[4, 4, 0, 0]} barSize={24} />
                        {/* Margin = White */}
                        <Line yAxisId="right" type="monotone" dataKey="Margin" stroke="#FFFFFF" strokeWidth={2} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
