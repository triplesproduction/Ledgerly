"use client";

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#121217] border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                {label && <p className="text-zinc-500 text-[10px] mb-1 font-bold uppercase tracking-wider">{label}</p>}
                <p className="text-white text-sm font-bold">
                    ₹{payload[0].value.toLocaleString()}
                </p>
                {payload[0].name !== 'value' && <p className="text-[10px] text-zinc-500 mt-0.5">{payload[0].name}</p>}
            </div>
        );
    }
    return null;
};

interface TrendData {
    name: string;
    amount: number;
}

export function ExpenseTrendChart({ data }: { data: TrendData[] }) {
    return (
        <div className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis 
                        dataKey="name" 
                        stroke="#71717a" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        dy={10}
                    />
                    <YAxis 
                        stroke="#71717a" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#f97316" 
                        strokeWidth={3} 
                        dot={{ r: 4, fill: "#18181b", stroke: "#f97316", strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: "#f97316", stroke: "#fff", strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

interface PieData {
    name: string;
    value: number;
}

export function CategoryBreakdownChart({ data }: { data: PieData[] }) {
    if (!data || data.length === 0) {
        return <div className="h-[300px] flex items-center justify-center text-zinc-500 text-sm italic">No data to display</div>;
    }

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span className="text-zinc-400 text-[11px] font-medium ml-1">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
