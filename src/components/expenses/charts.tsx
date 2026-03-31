"use client";

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#121217] border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md pointer-events-none z-50">
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
        <div className="h-[300px] w-full pt-4 overflow-hidden">
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
        return (
            <div className="h-[300px] w-full flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full border-4 border-white/5 border-t-orange-500/20 animate-spin" />
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest animate-pulse">Calculating Breakdown...</p>
            </div>
        );
    }

    return (
        <div className="h-[300px] w-full overflow-hidden">
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

export function SourceBreakdownChart({ data }: { data: PieData[] }) {
    if (!data || data.length === 0) {
        return (
            <div className="h-[250px] w-full flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-white/5 border-t-emerald-500/20 animate-spin" />
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest animate-pulse">Analyzing Sources...</p>
            </div>
        );
    }
    const SOURCE_COLORS = ['#10b981', '#f97316']; // You (Emerald), Dad (Orange)
    
    return (
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="55%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={10}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                        iconType="circle"
                        verticalAlign="top"
                        formatter={(value) => <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

export function FundUtilizationChart({ sent, spent }: { sent: number, spent: number }) {
    const data = [
        { name: 'Sent to Dad', amount: sent, fill: '#3b82f6' },
        { name: 'Spent by Dad', amount: spent, fill: '#f97316' }
    ];

    return (
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 20, bottom: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke="#71717a" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        width={90}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}} />
                    <Bar 
                        dataKey="amount" 
                        radius={[0, 8, 8, 0]} 
                        barSize={32}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
