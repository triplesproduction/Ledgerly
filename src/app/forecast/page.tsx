"use client";

import { useState } from "react";
import { RevenueAreaChart } from "@/components/charts/revenue-area-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ForecastPage() {
    const [range, setRange] = useState("30");

    return (
        <div className="min-h-screen bg-transparent text-foreground font-sans p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Forecast</h1>
                    <p className="text-muted-foreground mt-1">Projected cashflow based on recurring contracts and scheduled expenses.</p>
                </div>
                <Select value={range} onValueChange={setRange}>
                    <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                        <SelectValue placeholder="Select Range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="30">Next 30 Days</SelectItem>
                        <SelectItem value="60">Next 60 Days</SelectItem>
                        <SelectItem value="90">Next 90 Days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card className="bg-card border-white/5 shadow-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-white">Cashflow Projection</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[500px] w-full">
                        <RevenueAreaChart range={range} />
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border-indigo-500/20">
                    <CardHeader>
                        <CardTitle className="text-indigo-400">Recurring Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Projections assume active Retainer Contracts continue through the selected period.
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
                    <CardHeader>
                        <CardTitle className="text-rose-400">Scheduled Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Includes recurring details from "Recurring Expenses" and any one-off scheduled bills.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
