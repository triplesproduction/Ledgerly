
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IncomeExpenseBarChart } from "@/components/charts/income-expense-bar-chart";
import { BarChart3 } from "lucide-react";
import { startOfMonth, subMonths } from "date-fns";

interface RevenueTrendsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dateRange: { from: Date; to: Date };
}

export function RevenueTrendsDialog({ open, onOpenChange, dateRange }: RevenueTrendsDialogProps) {
    // defaults to 12 months trailing from the selected end date
    // If the user selected "All Time" (very wide range), we might want to respect that?
    // For now, let's assume if the range is small (<= 1 month), we show trends.
    // Actually, 'Revenue Trends' implies history. Let's strictly show Last 6 Months or 12 Months.

    const trendTo = dateRange.to;
    const trendFrom = startOfMonth(subMonths(trendTo, 11)); // Last 12 months

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[800px] p-0 gap-0 outline-none">
                <DialogHeader className="p-6 pb-2 space-y-1">
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart3 className="text-orange-500" size={20} />
                        Revenue Trends
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                        Income vs Expenses (Last 12 Months)
                    </p>
                </DialogHeader>

                <div className="p-6 h-[400px] w-full">
                    <IncomeExpenseBarChart from={trendFrom} to={trendTo} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
