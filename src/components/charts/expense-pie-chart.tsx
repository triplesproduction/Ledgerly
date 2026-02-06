"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

// Custom Tooltip (same as before)
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#14161C] border border-white/10 p-2 rounded-lg shadow-xl">
                <p className="text-white text-xs font-bold">{payload[0].name}</p>
                <p className="text-zinc-400 text-xs">₹{payload[0].value.toLocaleString()}</p>
            </div>
        );
    }
    return null;
};

interface ExpensePieChartProps {
    data: { name: string; value: number; color: string }[];
}

export function ExpensePieChart({ data }: ExpensePieChartProps) {
    if (!data || data.length === 0) {
        return <div className="h-full w-full flex items-center justify-center text-zinc-500 text-sm">No expense data available</div>;
    }

    return (
        <div className="h-full w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span className="text-zinc-400 text-[11px] font-medium">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
