"use client"

import * as React from "react"
import {
    format,
    subDays,
    startOfMonth,
    endOfMonth,
    subMonths,
    isSameDay,
    differenceInDays
} from "date-fns"
import { Calendar as CalendarIcon, ArrowRight } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    date?: DateRange
    onDateChange?: (date: DateRange | undefined) => void
}

const PRESETS = [
    {
        label: "Today",
        getValue: () => {
            const today = new Date();
            return { from: today, to: today };
        }
    },
    {
        label: "Yesterday",
        getValue: () => {
            const yesterday = subDays(new Date(), 1);
            return { from: yesterday, to: yesterday };
        }
    },
    {
        label: "Last 7 days",
        getValue: () => {
            const today = new Date();
            return { from: subDays(today, 6), to: today };
        }
    },
    {
        label: "Last 28 days",
        getValue: () => {
            const today = new Date();
            return { from: subDays(today, 27), to: today };
        }
    },
    {
        label: "Last 30 days",
        getValue: () => {
            const today = new Date();
            return { from: subDays(today, 29), to: today };
        }
    },
    {
        label: "This Month",
        getValue: () => {
            const today = new Date();
            return { from: startOfMonth(today), to: endOfMonth(today) };
        }
    },
    {
        label: "Last Month",
        getValue: () => {
            const today = new Date();
            const lastMonth = subMonths(today, 1);
            return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
        }
    }
];

export function DateRangePicker({
    className,
    date: controlledDate,
    onDateChange,
}: DateRangePickerProps) {
    // Internal state for uncontrolled usage
    // Default to Today if no date controlled or internal
    const [internalDate, setInternalDate] = React.useState<DateRange | undefined>({
        from: new Date(),
        to: new Date(),
    })

    const date = controlledDate ?? internalDate
    const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date)
    const [isOpen, setIsOpen] = React.useState(false)

    React.useEffect(() => {
        if (isOpen) {
            setTempDate(date)
        }
    }, [isOpen, date])

    const handleApply = () => {
        if (onDateChange) {
            onDateChange(tempDate)
        } else {
            setInternalDate(tempDate)
        }
        setIsOpen(false)
    }

    const handlePresetSelect = (presetValue: DateRange) => {
        setTempDate(presetValue);
    }

    // Helper to check if a preset is active
    const isPresetActive = (preset: { getValue: () => DateRange }) => {
        const pVal = preset.getValue();
        if (!tempDate?.from || !tempDate?.to) return false;
        return isSameDay(pVal.from!, tempDate.from) && isSameDay(pVal.to!, tempDate.to);
    }

    // Calculate days selected
    const selectedDaysCount = tempDate?.from && tempDate?.to
        ? differenceInDays(tempDate.to, tempDate.from) + 1
        : 0;

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal bg-[#16171D] border-white/10 text-white hover:bg-white/5 transition-all overflow-hidden",
                            !date && "text-muted-foreground",
                            className
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 text-orange-500" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "MMM dd, yyyy")} - {format(date.to, "MMM dd, yyyy")}
                                </>
                            ) : (
                                format(date.from, "MMM dd, yyyy")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#09090b] border-white/10 rounded-xl shadow-2xl shadow-black/80 overflow-hidden" align="start">
                    <div className="flex flex-col md:flex-row h-[500px] md:h-[400px]">

                        {/* 1. Sidebar Presets */}
                        <div className="w-full md:w-[150px] border-b md:border-b-0 md:border-r border-white/10 bg-[#0c0c10] p-2 flex flex-col gap-1 overflow-y-auto">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 px-2 pt-2">Quick Select</span>

                            {/* "Custom" Indicator */}
                            <Button
                                variant="ghost"
                                className={cn(
                                    "justify-start text-xs h-8 font-medium w-full",
                                    !PRESETS.some(p => isPresetActive(p))
                                        ? "bg-orange-600/10 text-orange-500 hover:bg-orange-600/20 hover:text-orange-400"
                                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                                )}
                                onClick={() => { }}
                            >
                                Custom Range
                            </Button>

                            {PRESETS.map((preset) => (
                                <Button
                                    key={preset.label}
                                    variant="ghost"
                                    className={cn(
                                        "justify-start text-xs h-8 font-medium w-full",
                                        isPresetActive(preset)
                                            ? "bg-orange-600 text-white hover:bg-orange-600 hover:text-white shadow-md shadow-orange-900/20"
                                            : "text-zinc-400 hover:text-white hover:bg-white/5"
                                    )}
                                    onClick={() => handlePresetSelect(preset.getValue())}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>

                        {/* 2. Main Calendar Area */}
                        <div className="flex-1 flex flex-col min-w-[300px] sm:min-w-[500px]">

                            {/* Inputs Header */}
                            <div className="flex items-center gap-3 p-3 border-b border-white/5 bg-[#0e0e11]">
                                <div className="grid gap-1 flex-1">
                                    <Label className="text-[9px] uppercase text-zinc-500 font-bold tracking-wider px-1">From</Label>
                                    <div className="bg-[#16171D] border border-white/10 rounded-md px-3 py-1.5 text-xs text-white font-medium flex items-center shadow-inner h-8">
                                        {tempDate?.from ? format(tempDate.from, "MMM dd, yyyy") : "Start Date"}
                                    </div>
                                </div>
                                <ArrowRight size={14} className="text-zinc-600 mt-4" />
                                <div className="grid gap-1 flex-1">
                                    <Label className="text-[9px] uppercase text-zinc-500 font-bold tracking-wider px-1">To</Label>
                                    <div className="bg-[#16171D] border border-white/10 rounded-md px-3 py-1.5 text-xs text-white font-medium flex items-center shadow-inner h-8">
                                        {tempDate?.to ? format(tempDate.to, "MMM dd, yyyy") : "End Date"}
                                    </div>
                                </div>
                            </div>

                            {/* Calendar View */}
                            <div className="p-2 flex justify-center bg-black/20 flex-1">
                                <Calendar
                                    key={tempDate?.from?.toString()} // Vital for updating view on preset click
                                    mode="range"
                                    defaultMonth={tempDate?.from}
                                    selected={tempDate}
                                    onSelect={setTempDate}
                                    numberOfMonths={2}
                                />
                            </div>

                            {/* Footer */}
                            <div className="border-t border-white/5 p-3 flex items-center justify-between bg-[#0e0e11]">
                                <span className="text-xs text-zinc-500 font-medium ml-1">
                                    {selectedDaysCount > 0 ? (
                                        <span className="text-zinc-300">{selectedDaysCount} days selected</span>
                                    ) : "Select range"}
                                </span>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-white" onClick={() => setIsOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button size="sm" className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 rounded-md" onClick={handleApply}>
                                        Apply
                                    </Button>
                                </div>
                            </div>

                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
