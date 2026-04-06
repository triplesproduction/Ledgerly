
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IncomeExpenseBarChart } from "@/components/charts/income-expense-bar-chart";
import { BarChart3 } from "lucide-react";
import { startOfMonth, subMonths } from "date-fns";

interface ExpenseTrendsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dateRange: { from: Date; to: Date };
}

export function ExpenseTrendsDialog({ open, onOpenChange, dateRange }: ExpenseTrendsDialogProps) {
    // Current date for trailing context
    const trendTo = dateRange.to;
    const trendFrom = startOfMonth(subMonths(trendTo, 11)); // Last 12 months

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[800px] w-[95vw] max-h-[90vh] overflow-y-auto custom-scrollbar p-0 gap-0 outline-none">
                <DialogHeader className="p-6 pb-2 space-y-1">
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart3 className="text-orange-500" size={20} />
                        Expense Trends
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                        Monthly Spending Analysis (Last 12 Months)
                    </p>
                </DialogHeader>

                <div className="p-6 h-[400px] w-full">
                    {/* We can use the same chart as income since it shows both, but focusing title on Expenses */}
                    <IncomeExpenseBarChart from={trendFrom} to={trendTo} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
