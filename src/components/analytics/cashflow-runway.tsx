"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";
import { format, parseISO } from "date-fns";

interface CashflowRunwayProps {
    income: any[];
    expenses: any[];
    totalLiquidity: number;
}

export function CashflowRunway({ income, expenses, totalLiquidity }: CashflowRunwayProps) {
    const monthlyStats: Record<string, { date: Date, inflow: number, burn: number }> = {};
    const getMonthKey = (dateStr: string) => format(parseISO(dateStr), "yyyy-MM");

    income.forEach(item => {
        if (item.status !== "RECEIVED") return;
        const key = getMonthKey(item.date);
        if (!monthlyStats[key]) monthlyStats[key] = { date: new Date(item.date), inflow: 0, burn: 0 };
        monthlyStats[key].inflow += Number(item.amount);
    });

    expenses.forEach(item => {
        if (item.status !== "PAID") return;
        const key = getMonthKey(item.date);
        if (!monthlyStats[key]) monthlyStats[key] = { date: new Date(item.date), inflow: 0, burn: 0 };
        monthlyStats[key].burn += Number(item.amount);
    });

    const chartData = Object.entries(monthlyStats)
        .map(([key, val]) => ({
            name: format(val.date, "MMM"),
            fullDate: key,
            inflow: val.inflow,
            burn: val.burn,
            net: val.inflow - val.burn
        }))
        .sort((a, b) => a.fullDate.localeCompare(b.fullDate))
        .slice(-6);

    const recentBurnMonths = chartData.slice(-3);
    const avgBurn = recentBurnMonths.length > 0
        ? recentBurnMonths.reduce((sum, m) => sum + m.burn, 0) / recentBurnMonths.length
        : 0;

    // Logic: If burn is 0, runway is Infinite. If Liquidity < 0 (debt), runway is 0.
    const runwayMonths = avgBurn > 0 ? (Math.max(0, totalLiquidity) / avgBurn).toFixed(1) : "∞";

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-card border border-white/10 p-4 rounded-xl shadow-xl backdrop-blur-md min-w-[160px]">
                    <p className="text-zinc-500 text-[10px] mb-3 font-bold uppercase tracking-wider">{label}</p>
                    <div className="space-y-2">
                        {/* White for Inflow (Positive) */}
                        <div className="flex justify-between text-xs items-center">
                            <span className="text-white font-medium">Inflow</span>
                            <span className="font-mono text-white font-bold">₹{payload[0].value.toLocaleString()}</span>
                        </div>
                        {/* Grey for Burn (Negative/Cost) */}
                        <div className="flex justify-between text-xs items-center">
                            <span className="text-zinc-500 font-medium">Burn</span>
                            <span className="font-mono text-zinc-400 font-bold">₹{payload[1].value.toLocaleString()}</span>
                        </div>
                        {/* Orange for Net Flow (Result) */}
                        <div className="border-t border-white/10 pt-2 flex justify-between text-xs items-center">
                            <span className="text-[#FF5500] font-medium">Net Flow</span>
                            <span className={`font-mono font-bold text-[#FF5500]`}>
                                {payload[2].value >= 0 ? '+' : ''}₹{payload[2].value.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6 lg:col-span-1">
                <Card className="bg-card border-white/5 shadow-xl">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Est. Runway</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-2">
                        <div className="text-4xl font-bold text-white">{runwayMonths} <span className="text-sm font-medium text-zinc-500 ml-1">Months</span></div>
                        <p className="text-xs text-zinc-600 mt-3 font-medium">Time until cash depletion at current burn rate.</p>
                    </CardContent>
                </Card>

                <Card className="bg-card border-white/5 shadow-xl">
                    <CardHeader className="p-8 pb-4">
                        <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Avg. Monthly Burn</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 pt-2">
                        <div className="text-4xl font-bold text-[#FF5500]">₹{(avgBurn / 1000).toFixed(1)}k</div>
                        <p className="text-xs text-zinc-600 mt-3 font-medium">Average expenses over the last 3 months.</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-card border-white/5 shadow-xl lg:col-span-2">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-sm font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-wider">
                        <Activity size={14} className="text-[#FF5500]" /> Cashflow Health (Inflow vs Burn)
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
                                stroke="#71717a"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `₹${val / 1000}k`}
                                fontFamily="var(--font-montserrat)"
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            {/* Inflow = White */}
                            <Bar dataKey="inflow" fill="#FFFFFF" radius={[4, 4, 0, 0]} barSize={24} />
                            {/* Burn = Dark Zinc (Subtle) */}
                            <Bar dataKey="burn" fill="#27272a" radius={[4, 4, 0, 0]} barSize={24} />
                            {/* Net = Orange (Highlights) */}
                            <Line type="monotone" dataKey="net" stroke="#FF5500" strokeWidth={3} dot={{ r: 4, fill: '#18181b', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
