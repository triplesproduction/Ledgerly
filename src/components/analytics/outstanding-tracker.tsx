"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Wallet } from "lucide-react";
import { format, parseISO } from "date-fns";

interface OutstandingTrackerProps {
    income: any[];
}

export function OutstandingTracker({ income }: OutstandingTrackerProps) {
    const monthlyStats: Record<string, { date: Date, received: number, pending: number, overdue: number }> = {};
    const getMonthKey = (dateStr: string) => format(parseISO(dateStr), "yyyy-MM");

    income.forEach(item => {
        const key = getMonthKey(item.date);
        if (!monthlyStats[key]) monthlyStats[key] = { date: new Date(item.date), received: 0, pending: 0, overdue: 0 };

        const amount = Number(item.amount);
        if (item.status === 'RECEIVED') monthlyStats[key].received += amount;
        else if (item.status === 'OVERDUE') monthlyStats[key].overdue += amount;
        else if (item.status === 'PENDING') monthlyStats[key].pending += amount;
    });

    const chartData = Object.entries(monthlyStats)
        .map(([key, val]) => ({
            name: format(val.date, "MMM"),
            fullDate: key,
            Received: val.received,
            Pending: val.pending,
            Overdue: val.overdue
        }))
        .sort((a, b) => a.fullDate.localeCompare(b.fullDate))
        .slice(-6);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-card border border-white/10 p-4 rounded-xl shadow-xl backdrop-blur-md min-w-[150px]">
                    <p className="text-zinc-500 text-[10px] mb-3 font-bold uppercase tracking-wider">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between text-xs mb-2 items-center">
                            <span className="font-medium" style={{ color: entry.color }}>{entry.name}</span>
                            <span className="font-mono text-white font-bold">₹{entry.value.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="bg-card border-white/5 shadow-xl">
            <CardHeader className="p-8 pb-4">
                <CardTitle className="text-sm font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-wider">
                    <Wallet size={14} className="text-[#FF5500]" /> Collection Status (Outstanding vs Received)
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px] p-8 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
                            stroke="#71717a"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => `₹${val / 1000}k`}
                            fontFamily="var(--font-montserrat)"
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontFamily: 'var(--font-montserrat)' }}
                            formatter={(value) => <span className="text-zinc-500 font-medium ml-1">{value}</span>}
                        />
                        {/* Received = White */}
                        <Bar dataKey="Received" stackId="a" fill="#FFFFFF" barSize={32} radius={[0, 0, 0, 0]} />
                        {/* Pending = Orange */}
                        <Bar dataKey="Pending" stackId="a" fill="#FF5500" barSize={32} radius={[0, 0, 0, 0]} />
                        {/* Overdue = Dark Zinc */}
                        <Bar dataKey="Overdue" stackId="a" fill="#27272a" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
