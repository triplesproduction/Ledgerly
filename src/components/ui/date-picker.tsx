"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    date?: Date | undefined
    setDate?: (date: Date | undefined) => void
    fromDate?: Date  // Minimum selectable date
}

export function DatePicker({
    className,
    date: controlledDate,
    setDate: setControlledDate,
    fromDate,
}: DatePickerProps) {
    const [internalDate, setInternalDate] = React.useState<Date | undefined>(new Date())
    const date = controlledDate !== undefined ? controlledDate : internalDate
    const setDate = setControlledDate || setInternalDate

    const [isOpen, setIsOpen] = React.useState(false)

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:text-white h-11 px-4 rounded-xl transition-all",
                        date && "text-white",
                        className
                    )}
                >
                    <CalendarIcon className="mr-3 h-4 w-4 text-orange-500" />
                    {date ? format(date, "MMMM do, yyyy") : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#0c0c0e] border border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.9)] rounded-3xl overflow-hidden !z-[100]" align="center" side="right" sideOffset={12} avoidCollisions={false}>
                <div className="flex flex-col">
                    <div className="p-4 border-b border-white/5 bg-[#111114] flex items-center justify-between px-6 py-5">
                        <span className="text-xs font-bold text-white uppercase tracking-[0.2em]">Select Date</span>
                        {date && (
                            <span className="text-[10px] bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full border border-orange-500/20 font-bold uppercase tracking-wider">
                                {format(date, "MMM dd")}
                            </span>
                        )}
                    </div>

                    <div className="p-4 flex items-center justify-center bg-[#0c0c0e]">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(newDate) => {
                                if (newDate) {
                                    setDate(newDate)
                                    setIsOpen(false)
                                }
                            }}
                            disabled={(date) => fromDate ? date < fromDate : false}
                            initialFocus
                            className="p-0"
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
