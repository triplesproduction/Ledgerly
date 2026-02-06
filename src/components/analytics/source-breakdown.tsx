"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

// STRICT BLACK / ORANGE / WHITE THEME
// Primary: #FF5500 (Orange)
// Secondary: #FFFFFF (White)
// Tertiaries: Zinc Shades (Greys)
const COLORS = [
    "#FF5500", // Orange
    "#FFFFFF", // White
    "#52525b", // Zinc-600
    "#3f3f46", // Zinc-700
    "#27272a", // Zinc-800
    "#18181b", // Zinc-900
];

interface SourceBreakdownProps {
    data: any[];
}

export function SourceBreakdown({ data }: SourceBreakdownProps) {
    const serviceMap: Record<string, number> = {};
    const clientMap: Record<string, number> = {};

    data.forEach(item => {
        if (item.status !== "RECEIVED") return;
        const amount = Number(item.amount) || 0;
        const service = item.service_name || item.category || "Uncategorized";
        serviceMap[service] = (serviceMap[service] || 0) + amount;

        const client = item.client_name || item.client || "Unknown Client";
        clientMap[client] = (clientMap[client] || 0) + amount;
    });

    const toChartData = (map: Record<string, number>) => Object.entries(map)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const serviceData = toChartData(serviceMap);
    const clientData = toChartData(clientMap);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-card border border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md">
                    <p className="text-zinc-400 text-[10px] mb-1 font-medium">{payload[0].name}</p>
                    <p className="text-white text-sm font-bold">₹{payload[0].value.toLocaleString()}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card border-white/5 shadow-xl">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-sm font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-wider">
                        <PieChartIcon size={14} className="text-[#FF5500]" /> Revenue by Service
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] p-8 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={serviceData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {serviceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                layout="vertical"
                                verticalAlign="middle"
                                align="right"
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-montserrat)' }}
                                formatter={(value) => <span className="text-zinc-500 font-medium ml-1">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="bg-card border-white/5 shadow-xl">
                <CardHeader className="p-8 pb-4">
                    <CardTitle className="text-sm font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-wider">
                        <PieChartIcon size={14} className="text-[#FF5500]" /> Revenue by Client
                    </CardTitle>
                </CardHeader>
                <CardContent className="h-[350px] p-8 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={clientData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {clientData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                layout="vertical"
                                verticalAlign="middle"
                                align="right"
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: '11px', fontFamily: 'var(--font-montserrat)' }}
                                formatter={(value) => <span className="text-zinc-500 font-medium ml-1">{value.length > 15 ? value.substring(0, 15) + '...' : value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
