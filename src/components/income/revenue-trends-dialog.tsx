
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IncomeExpenseBarChart } from "@/components/charts/income-expense-bar-chart";
import { BarChart3 } from "lucide-react";

interface RevenueTrendsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dateRange: { from: Date; to: Date };
}

export function RevenueTrendsDialog({ open, onOpenChange, dateRange }: RevenueTrendsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border-white/10 text-foreground sm:max-w-[800px] p-0 gap-0 outline-none">
                <DialogHeader className="p-6 pb-2 space-y-1">
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart3 className="text-orange-500" size={20} />
                        Revenue Trends
                    </DialogTitle>
                    <p className="text-xs text-muted-foreground">
                        Income vs Expenses for selected period
                    </p>
                </DialogHeader>

                <div className="p-6 h-[400px] w-full">
                    <IncomeExpenseBarChart from={dateRange.from} to={dateRange.to} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
