"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

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
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:text-white h-11 px-4 rounded-xl transition-all text-sm",
                        date && "text-white",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-orange-500 shrink-0" />
                    <span className="truncate">{date ? format(date, "MMM do, yyyy") : <span>Pick a date</span>}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="p-0 border-0 bg-transparent shadow-none w-full max-w-[95vw] sm:max-w-fit flex items-center justify-center !z-[200]">
                <div className="w-full sm:w-[350px] bg-[#0c0c0e] border border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.9)] rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex flex-col">
                        <div className="p-4 border-b border-white/5 bg-[#111114] flex items-center justify-between px-6 py-5">
                            <DialogHeader>
                                <DialogTitle className="text-xs font-bold text-white uppercase tracking-[0.2em] text-left">
                                    Select Date
                                </DialogTitle>
                            </DialogHeader>
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
                                className="p-0 scale-100 sm:scale-110"
                            />
                        </div>

                        <div className="p-4 border-t border-white/5 bg-[#111114]/50 flex items-center justify-end gap-3 px-6">
                            <Button
                                variant="ghost"
                                onClick={() => setIsOpen(false)}
                                className="text-xs font-medium text-zinc-500 hover:text-white transition-colors h-9 px-4 rounded-xl hover:bg-white/5"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
