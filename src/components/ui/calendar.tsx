import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, useNavigation } from "react-day-picker"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            fixedWeeks
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-8 sm:space-y-0",
                month: "space-y-6",
                month_grid: "w-full border-separate border-spacing-x-1 border-spacing-y-2",
                weekdays: "flex",
                weekday: "text-zinc-500 w-10 font-bold text-[10px] uppercase tracking-widest text-center",
                week: "flex w-full mt-2",
                day: "h-10 w-10 flex items-center justify-center p-0 relative focus-within:relative focus-within:z-20",
                day_button: cn(
                    "h-10 w-10 p-0 font-medium aria-selected:opacity-100 rounded-xl transition-all hover:bg-white/10 hover:text-white flex items-center justify-center text-sm text-zinc-300"
                ),
                selected: "bg-orange-500 text-white hover:bg-orange-500 hover:text-white focus:bg-orange-500 focus:text-white shadow-[0_0_25px_rgba(249,115,22,0.5),0_0_10px_rgba(249,115,22,0.3)] font-black rounded-xl",
                today: "text-orange-500 font-bold after:content-[''] after:absolute after:bottom-2 after:h-1.5 after:w-1.5 after:bg-orange-500 after:rounded-full after:left-1/2 after:-translate-x-1/2 shadow-orange-500/20 shadow-sm",
                outside: "text-zinc-700 opacity-30 aria-selected:bg-orange-500/5 aria-selected:text-zinc-700 aria-selected:opacity-20",
                disabled: "text-zinc-800 opacity-20",
                range_start: "range-start rounded-r-none rounded-l-xl",
                range_end: "range-end rounded-l-none rounded-r-xl",
                range_middle: "aria-selected:bg-orange-500/[0.12] aria-selected:text-orange-400 font-bold rounded-none",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                MonthCaption: CustomCaption,
                Nav: () => null,
            } as any}
            {...props}
        />
    )
}

function CustomCaption({ calendarMonth, ...props }: any) {
    const { goToMonth, nextMonth, previousMonth } = useNavigation()

    return (
        <div className="flex justify-between items-center w-full pt-1 mb-4">
            <button
                type="button"
                className={cn(
                    "h-7 w-7 bg-white/5 p-0 hover:bg-orange-500/20 border border-white/5 text-zinc-100 hover:text-white rounded-lg transition-all flex items-center justify-center hover:scale-105 active:scale-95 z-20",
                    !previousMonth && "opacity-50 pointer-events-none"
                )}
                disabled={!previousMonth}
                onClick={() => previousMonth && goToMonth(previousMonth)}
            >
                <ChevronLeft className="h-4 w-4 stroke-[2.5px]" />
            </button>
            <div className="text-sm font-bold text-zinc-100 tracking-[0.2em] uppercase h-9 flex items-center justify-center">
                {format(calendarMonth.date, "MMMM yyyy")}
            </div>
            <button
                type="button"
                className={cn(
                    "h-7 w-7 bg-white/5 p-0 hover:bg-orange-500/20 border border-white/5 text-zinc-100 hover:text-white rounded-lg transition-all flex items-center justify-center hover:scale-105 active:scale-95 z-20",
                    !nextMonth && "opacity-50 pointer-events-none"
                )}
                disabled={!nextMonth}
                onClick={() => nextMonth && goToMonth(nextMonth)}
            >
                <ChevronRight className="h-4 w-4 stroke-[2.5px]" />
            </button>
        </div>
    )
}
Calendar.displayName = "Calendar"

export { Calendar }
