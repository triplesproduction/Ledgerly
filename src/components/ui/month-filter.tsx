"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth, getYear, getMonth, setYear as setDateYear, setMonth as setDateMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function MonthFilter() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [selectedMonth, setSelectedMonth] = useState<number>(getMonth(new Date())); // 0-11
    const [selectedYear, setSelectedYear] = useState<number>(getYear(new Date()));

    // Sync state with URL on mount and URL changes
    useEffect(() => {
        const from = searchParams.get("from");
        if (from) {
            const date = new Date(from);
            if (!isNaN(date.getTime())) {
                setSelectedMonth(getMonth(date));
                setSelectedYear(getYear(date));
            }
        } else {
            // If no URL params, force "This Month" to ensure parent components (ExpensesPage) sync correctly
            updateRange(selectedMonth, selectedYear);
        }
    }, [searchParams]);

    // Update URL when month or year changes
    const updateRange = (month: number, year: number) => {
        const date = new Date(year, month, 1);
        const from = format(startOfMonth(date), 'yyyy-MM-dd');
        const to = format(endOfMonth(date), 'yyyy-MM-dd');
        const params = new URLSearchParams(searchParams.toString());
        params.set("from", from);
        params.set("to", to);
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleMonthChange = (value: string) => {
        const newMonth = parseInt(value);
        setSelectedMonth(newMonth);
        updateRange(newMonth, selectedYear);
    };

    const handleYearChange = (value: string) => {
        const newYear = parseInt(value);
        setSelectedYear(newYear);
        updateRange(selectedMonth, newYear);
    };

    const handlePrev = () => {
        let newMonth = selectedMonth - 1;
        let newYear = selectedYear;

        if (newMonth < 0) {
            newMonth = 11;
            newYear -= 1;
        }

        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
        updateRange(newMonth, newYear);
    };

    const handleNext = () => {
        let newMonth = selectedMonth + 1;
        let newYear = selectedYear;

        if (newMonth > 11) {
            newMonth = 0;
            newYear += 1;
        }

        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
        updateRange(newMonth, newYear);
    };

    const handleQuickRange = (type: 'this' | 'last') => {
        const date = type === 'this' ? new Date() : subMonths(new Date(), 1);
        const newMonth = getMonth(date);
        const newYear = getYear(date);
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
        updateRange(newMonth, newYear);
    };

    const handleLifetime = () => {
        // Set a very wide date range to show all data
        const from = '2000-01-01';
        const to = '2099-12-31';
        const params = new URLSearchParams(searchParams.toString());
        params.set("from", from);
        params.set("to", to);
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
    };

    // Generate available years dynamically (from 2020 to 3 years in the future)
    const availableYears = useMemo(() => {
        const currentYear = getYear(new Date());
        const years = [];
        const startYear = 2020; // Start from 2020 to support historical data
        const endYear = currentYear + 3; // Include 3 years in the future
        for (let i = startYear; i <= endYear; i++) {
            years.push(i);
        }
        return years; // Chronological order (ascending)
    }, []);

    // Month names
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const now = new Date();
    const isThisMonth = selectedMonth === getMonth(now) && selectedYear === getYear(now);
    const lastMonthDate = subMonths(now, 1);
    const isLastMonth = selectedMonth === getMonth(lastMonthDate) && selectedYear === getYear(lastMonthDate);

    // Check if viewing lifetime (very wide date range)
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const isLifetime = from && to && new Date(from).getFullYear() <= 2000 && new Date(to).getFullYear() >= 2099;

    return (
        <div className="flex items-center gap-3">
            {/* Unified Filter Container */}
            <div className="flex items-center bg-white/5 h-10 rounded-xl px-1.5 gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-white/10 text-muted-foreground rounded-lg"
                    onClick={handlePrev}
                >
                    <ChevronLeft size={16} />
                </Button>

                <div className="flex items-center px-2 gap-2">
                    <Select
                        value={selectedMonth.toString()}
                        onValueChange={handleMonthChange}
                    >
                        <SelectTrigger className="border-0 bg-transparent h-8 text-sm font-semibold text-white focus:ring-0 px-2 min-w-[110px] hover:bg-white/5 rounded-md text-center justify-center gap-2">
                            <SelectValue>{months[selectedMonth]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#121214] border-white/10 text-white max-h-[300px] z-[100]">
                            {months.map((month, index) => (
                                <SelectItem key={index} value={index.toString()} className="cursor-pointer focus:bg-white/10 focus:text-white">
                                    {month}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="w-px h-4 bg-white/10 mx-1"></div>

                    <Select
                        value={selectedYear.toString()}
                        onValueChange={handleYearChange}
                    >
                        <SelectTrigger className="border-0 bg-transparent h-8 text-sm font-semibold text-white focus:ring-0 px-2 min-w-[80px] hover:bg-white/5 rounded-md text-center justify-center gap-2">
                            <SelectValue>{selectedYear}</SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-[#121214] border-white/10 text-white z-[100]">
                            {availableYears.map((year) => (
                                <SelectItem key={year} value={year.toString()} className="cursor-pointer focus:bg-white/10 focus:text-white">
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-white/10 text-muted-foreground rounded-lg"
                    onClick={handleNext}
                >
                    <ChevronRight size={16} />
                </Button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl h-10 hidden lg:flex">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickRange('this')}
                    className={cn(
                        "h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                        isThisMonth ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-muted-foreground hover:text-white hover:bg-white/10"
                    )}
                >
                    This Month
                </Button>
                <div className="w-px h-4 bg-white/10"></div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleQuickRange('last')}
                    className={cn(
                        "h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                        isLastMonth ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-muted-foreground hover:text-white hover:bg-white/10"
                    )}
                >
                    Last Month
                </Button>
                <div className="w-px h-4 bg-white/10"></div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLifetime}
                    className={cn(
                        "h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                        isLifetime ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-muted-foreground hover:text-white hover:bg-white/10"
                    )}
                >
                    All Time
                </Button>
            </div>
        </div>
    );
}
