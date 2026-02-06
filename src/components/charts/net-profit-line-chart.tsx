"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Custom Tooltip (same)
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#14161C] border border-white/10 p-3 rounded-lg shadow-xl">
                <p className="text-zinc-500 text-[10px] mb-1 font-semibold uppercase">{label}</p>
                <p className="text-orange-500 text-sm font-bold">
                    ₹{payload[0].value.toLocaleString()}
                </p>
            </div>
        );
    }
    return null;
};

interface NetProfitLineChartProps {
    data: { name: string; profit: number }[];
}

export function NetProfitLineChart({ data }: NetProfitLineChartProps) {
    if (!data || data.length === 0) {
        return <div className="h-full w-full flex items-center justify-center text-zinc-500 text-sm">No profit data available</div>;
    }

    return (
        <div className="h-full w-full min-h-[250px] p-2">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#666"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis
                        stroke="#666"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₹${value / 1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Line
                        type="monotone"
                        dataKey="profit"
                        stroke="#f97316" // Orange-500
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#14161C", stroke: "#f97316", strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: "#f97316" }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
