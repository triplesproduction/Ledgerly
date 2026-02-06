"use client";

import * as React from "react";
import { CalendarIcon, Clock, ChevronDown } from "lucide-react";
import {
    startOfWeek,
    endOfWeek,
    subDays,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    startOfDay,
    endOfDay,
} from "date-fns";
import { toDate, formatInTimeZone } from "date-fns-tz";
import { DateRange } from "react-day-picker";
import { cva, VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const multiSelectVariants = cva(
    "flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/20 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20",
                destructive: "bg-red-500 text-white hover:bg-red-600",
                outline: "border border-white/5 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-white",
                secondary: "bg-zinc-800 text-white hover:bg-zinc-700 border border-white/5",
                ghost: "hover:bg-white/5 text-zinc-400 hover:text-white",
                link: "text-orange-500 underline-offset-4 hover:underline",
            },
        },
        defaultVariants: {
            variant: "outline",
        },
    }
);

interface CalendarDatePickerProps
    extends React.HTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof multiSelectVariants> {
    id?: string;
    className?: string;
    date: DateRange;
    closeOnSelect?: boolean;
    numberOfMonths?: 1 | 2;
    yearsRange?: number;
    onDateSelect: (range: { from: Date; to: Date }) => void;
}

export const CalendarDatePicker = React.forwardRef<
    HTMLButtonElement,
    CalendarDatePickerProps
>(
    (
        {
            id = "calendar-date-picker",
            className,
            date,
            closeOnSelect = false,
            numberOfMonths = 2,
            yearsRange = 10,
            onDateSelect,
            variant,
            ...props
        },
        ref
    ) => {
        const [isDialogOpen, setIsDialogOpen] = React.useState(false);
        const [selectedRange, setSelectedRange] = React.useState<string | null>(
            numberOfMonths === 2 ? "This Year" : "Today"
        );
        const [monthFrom, setMonthFrom] = React.useState<Date | undefined>(
            date?.from
        );
        const [yearFrom, setYearFrom] = React.useState<number | undefined>(
            date?.from?.getFullYear()
        );
        const [monthTo, setMonthTo] = React.useState<Date | undefined>(
            numberOfMonths === 2 ? date?.to : date?.from
        );
        const [yearTo, setYearTo] = React.useState<number | undefined>(
            numberOfMonths === 2 ? date?.to?.getFullYear() : date?.from?.getFullYear()
        );
        const [highlightedPart, setHighlightedPart] = React.useState<string | null>(
            null
        );

        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const handleClose = () => setIsDialogOpen(false);

        const selectDateRange = (from: Date, to: Date, range: string) => {
            const startDate = startOfDay(toDate(from, { timeZone }));
            const endDate =
                numberOfMonths === 2 ? endOfDay(toDate(to, { timeZone })) : startDate;
            onDateSelect({ from: startDate, to: endDate });
            setSelectedRange(range);
            setMonthFrom(from);
            setYearFrom(from.getFullYear());
            setMonthTo(to);
            setYearTo(to.getFullYear());
            closeOnSelect && setIsDialogOpen(false);
        };

        const handleDateSelect = (range: DateRange | undefined) => {
            if (range) {
                let from = startOfDay(toDate(range.from as Date, { timeZone }));
                let to = range.to ? endOfDay(toDate(range.to, { timeZone })) : from;
                if (numberOfMonths === 1) {
                    if (range.from !== date.from) {
                        to = from;
                    } else {
                        from = startOfDay(toDate(range.to as Date, { timeZone }));
                    }
                }
                onDateSelect({ from, to });
                setMonthFrom(from);
                setYearFrom(from.getFullYear());
                setMonthTo(to);
                setYearTo(to.getFullYear());
            }
            setSelectedRange(null);
        };

        const handleMonthChange = (newMonthIndex: number, part: string) => {
            setSelectedRange(null);
            if (part === "from") {
                if (yearFrom !== undefined) {
                    if (newMonthIndex < 0 || newMonthIndex > 11) return;
                    const newMonth = new Date(yearFrom, newMonthIndex, 1);
                    const from =
                        numberOfMonths === 2
                            ? startOfMonth(toDate(newMonth, { timeZone }))
                            : date?.from
                                ? new Date(
                                    date.from.getFullYear(),
                                    newMonth.getMonth(),
                                    date.from.getDate()
                                )
                                : newMonth;
                    const to =
                        numberOfMonths === 2
                            ? date.to
                                ? endOfDay(toDate(date.to, { timeZone }))
                                : endOfMonth(toDate(newMonth, { timeZone }))
                            : from;
                    if (from <= to) {
                        onDateSelect({ from, to });
                        setMonthFrom(newMonth);
                    }
                }
            } else {
                if (yearTo !== undefined) {
                    if (newMonthIndex < 0 || newMonthIndex > 11) return;
                    const newMonth = new Date(yearTo, newMonthIndex, 1);
                    const from = date.from
                        ? startOfDay(toDate(date.from, { timeZone }))
                        : startOfMonth(toDate(newMonth, { timeZone }));
                    const to =
                        numberOfMonths === 2
                            ? endOfMonth(toDate(newMonth, { timeZone }))
                            : from;
                    if (from <= to) {
                        onDateSelect({ from, to });
                        setMonthTo(newMonth);
                    }
                }
            }
        };

        const handleYearChange = (newYear: number, part: string) => {
            setSelectedRange(null);
            if (part === "from") {
                if (years.includes(newYear)) {
                    const newMonth = monthFrom
                        ? new Date(newYear, monthFrom.getMonth(), 1)
                        : new Date(newYear, 0, 1);
                    const from =
                        numberOfMonths === 2
                            ? startOfMonth(toDate(newMonth, { timeZone }))
                            : date.from
                                ? new Date(newYear, newMonth.getMonth(), date.from.getDate())
                                : newMonth;
                    const to =
                        numberOfMonths === 2
                            ? date.to
                                ? endOfDay(toDate(date.to, { timeZone }))
                                : endOfMonth(toDate(newMonth, { timeZone }))
                            : from;
                    if (from <= to) {
                        onDateSelect({ from, to });
                        setYearFrom(newYear);
                        setMonthFrom(newMonth);
                    }
                }
            } else {
                if (years.includes(newYear)) {
                    const newMonth = monthTo
                        ? new Date(newYear, monthTo.getMonth(), 1)
                        : new Date(newYear, 0, 1);
                    const from = date.from
                        ? startOfDay(toDate(date.from, { timeZone }))
                        : startOfMonth(toDate(newMonth, { timeZone }));
                    const to =
                        numberOfMonths === 2
                            ? endOfMonth(toDate(newMonth, { timeZone }))
                            : from;
                    if (from <= to) {
                        onDateSelect({ from, to });
                        setYearTo(newYear);
                        setMonthTo(newMonth);
                    }
                }
            }
        };

        const today = new Date();

        const years = Array.from(
            { length: yearsRange + 1 },
            (_, i) => today.getFullYear() - yearsRange / 2 + i
        );

        const dateRanges = [
            { label: "Today", start: today, end: today },
            { label: "Yesterday", start: subDays(today, 1), end: subDays(today, 1) },
            {
                label: "This Week",
                start: startOfWeek(today, { weekStartsOn: 1 }),
                end: endOfWeek(today, { weekStartsOn: 1 }),
            },
            {
                label: "Last Week",
                start: subDays(startOfWeek(today, { weekStartsOn: 1 }), 7),
                end: subDays(endOfWeek(today, { weekStartsOn: 1 }), 7),
            },
            { label: "Last 7 Days", start: subDays(today, 6), end: today },
            {
                label: "This Month",
                start: startOfMonth(today),
                end: endOfMonth(today),
            },
            {
                label: "Last Month",
                start: startOfMonth(subDays(today, today.getDate())),
                end: endOfMonth(subDays(today, today.getDate())),
            },
            { label: "This Year", start: startOfYear(today), end: endOfYear(today) },
            {
                label: "Last Year",
                start: startOfYear(subDays(today, 365)),
                end: endOfYear(subDays(today, 365)),
            },
        ];

        const handleMouseOver = (part: string) => {
            setHighlightedPart(part);
        };

        const handleMouseLeave = () => {
            setHighlightedPart(null);
        };

        const handleWheel = (event: React.WheelEvent, part: string) => {
            event.preventDefault();
            setSelectedRange(null);
            if (highlightedPart === "firstDay") {
                const newDate = new Date(date.from as Date);
                const increment = event.deltaY > 0 ? -1 : 1;
                newDate.setDate(newDate.getDate() + increment);
                if (newDate <= (date.to as Date)) {
                    numberOfMonths === 2
                        ? onDateSelect({ from: newDate, to: new Date(date.to as Date) })
                        : onDateSelect({ from: newDate, to: newDate });
                    setMonthFrom(newDate);
                } else if (newDate > (date.to as Date) && numberOfMonths === 1) {
                    onDateSelect({ from: newDate, to: newDate });
                    setMonthFrom(newDate);
                }
            } else if (highlightedPart === "firstMonth") {
                const currentMonth = monthFrom ? monthFrom.getMonth() : 0;
                const newMonthIndex = currentMonth + (event.deltaY > 0 ? -1 : 1);
                handleMonthChange(newMonthIndex, "from");
            } else if (highlightedPart === "firstYear" && yearFrom !== undefined) {
                const newYear = yearFrom + (event.deltaY > 0 ? -1 : 1);
                handleYearChange(newYear, "from");
            } else if (highlightedPart === "secondDay") {
                const newDate = new Date(date.to as Date);
                const increment = event.deltaY > 0 ? -1 : 1;
                newDate.setDate(newDate.getDate() + increment);
                if (newDate >= (date.from as Date)) {
                    onDateSelect({ from: new Date(date.from as Date), to: newDate });
                    setMonthTo(newDate);
                }
            } else if (highlightedPart === "secondMonth") {
                const currentMonth = monthTo ? monthTo.getMonth() : 0;
                const newMonthIndex = currentMonth + (event.deltaY > 0 ? -1 : 1);
                handleMonthChange(newMonthIndex, "to");
            } else if (highlightedPart === "secondYear" && yearTo !== undefined) {
                const newYear = yearTo + (event.deltaY > 0 ? -1 : 1);
                handleYearChange(newYear, "to");
            }
        };

        React.useEffect(() => {
            const firstDayElement = document.getElementById(`firstDay-${id}`);
            const firstMonthElement = document.getElementById(`firstMonth-${id}`);
            const firstYearElement = document.getElementById(`firstYear-${id}`);
            const secondDayElement = document.getElementById(`secondDay-${id}`);
            const secondMonthElement = document.getElementById(`secondMonth-${id}`);
            const secondYearElement = document.getElementById(`secondYear-${id}`);

            const elements = [
                firstDayElement,
                firstMonthElement,
                firstYearElement,
                secondDayElement,
                secondMonthElement,
                secondYearElement,
            ];

            const addPassiveEventListener = (element: HTMLElement | null) => {
                if (element) {
                    element.addEventListener(
                        "wheel",
                        handleWheel as unknown as EventListener,
                        {
                            passive: false,
                        }
                    );
                }
            };

            elements.forEach(addPassiveEventListener);

            return () => {
                elements.forEach((element) => {
                    if (element) {
                        element.removeEventListener(
                            "wheel",
                            handleWheel as unknown as EventListener
                        );
                    }
                });
            };
        }, [highlightedPart, date]);

        const formatWithTz = (date: Date, fmt: string) =>
            formatInTimeZone(date, timeZone, fmt);

        return (
            <>
                <style>
                    {`
            .date-part {
              touch-action: none;
              cursor: ns-resize;
            }
          `}
                </style>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            id="date"
                            ref={ref}
                            {...props}
                            variant="outline"
                            className={cn(
                                "w-full justify-start text-left font-normal bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:text-white h-11 px-4 rounded-xl transition-all",
                                className
                            )}
                            suppressHydrationWarning
                        >
                            <CalendarIcon className="mr-3 h-4 w-4 text-orange-500" />
                            <span className="truncate">
                                {date?.from ? (
                                    date.to ? (
                                        <>
                                            <span
                                                id={`firstDay-${id}`}
                                                className={cn(
                                                    "date-part",
                                                    highlightedPart === "firstDay" &&
                                                    "text-orange-500 font-bold underline decoration-orange-500/50"
                                                )}
                                                onMouseOver={() => handleMouseOver("firstDay")}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                {formatWithTz(date.from, "dd")}
                                            </span>{" "}
                                            <span
                                                id={`firstMonth-${id}`}
                                                className={cn(
                                                    "date-part",
                                                    highlightedPart === "firstMonth" &&
                                                    "text-orange-500 font-bold underline decoration-orange-500/50"
                                                )}
                                                onMouseOver={() => handleMouseOver("firstMonth")}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                {formatWithTz(date.from, "LLL")}
                                            </span>
                                            ,{" "}
                                            <span
                                                id={`firstYear-${id}`}
                                                className={cn(
                                                    "date-part",
                                                    highlightedPart === "firstYear" &&
                                                    "text-orange-500 font-bold underline decoration-orange-500/50"
                                                )}
                                                onMouseOver={() => handleMouseOver("firstYear")}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                {formatWithTz(date.from, "y")}
                                            </span>
                                            {numberOfMonths === 2 && (
                                                <>
                                                    {" — "}
                                                    <span
                                                        id={`secondDay-${id}`}
                                                        className={cn(
                                                            "date-part",
                                                            highlightedPart === "secondDay" &&
                                                            "text-orange-500 font-bold underline decoration-orange-500/50"
                                                        )}
                                                        onMouseOver={() => handleMouseOver("secondDay")}
                                                        onMouseLeave={handleMouseLeave}
                                                    >
                                                        {formatWithTz(date.to, "dd")}
                                                    </span>{" "}
                                                    <span
                                                        id={`secondMonth-${id}`}
                                                        className={cn(
                                                            "date-part",
                                                            highlightedPart === "secondMonth" &&
                                                            "text-orange-500 font-bold underline decoration-orange-500/50"
                                                        )}
                                                        onMouseOver={() => handleMouseOver("secondMonth")}
                                                        onMouseLeave={handleMouseLeave}
                                                    >
                                                        {formatWithTz(date.to, "LLL")}
                                                    </span>
                                                    ,{" "}
                                                    <span
                                                        id={`secondYear-${id}`}
                                                        className={cn(
                                                            "date-part",
                                                            highlightedPart === "secondYear" &&
                                                            "text-orange-500 font-bold underline decoration-orange-500/50"
                                                        )}
                                                        onMouseOver={() => handleMouseOver("secondYear")}
                                                        onMouseLeave={handleMouseLeave}
                                                    >
                                                        {formatWithTz(date.to, "y")}
                                                    </span>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <span
                                                id="day"
                                                className={cn(
                                                    "date-part",
                                                    highlightedPart === "day" && "text-orange-500 font-bold underline"
                                                )}
                                                onMouseOver={() => handleMouseOver("day")}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                {formatWithTz(date.from, "dd")}
                                            </span>{" "}
                                            <span
                                                id="month"
                                                className={cn(
                                                    "date-part",
                                                    highlightedPart === "month" && "text-orange-500 font-bold underline"
                                                )}
                                                onMouseOver={() => handleMouseOver("month")}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                {formatWithTz(date.from, "LLL")}
                                            </span>
                                            ,{" "}
                                            <span
                                                id="year"
                                                className={cn(
                                                    "date-part",
                                                    highlightedPart === "year" && "text-orange-500 font-bold underline"
                                                )}
                                                onMouseOver={() => handleMouseOver("year")}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                {formatWithTz(date.from, "y")}
                                            </span>
                                        </>
                                    )
                                ) : (
                                    <span>Pick a date</span>
                                )}
                            </span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-fit flex items-center justify-center">
                        <div className="w-[960px] bg-[#0c0c0e] border border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.9)] rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex h-[580px]">
                                {numberOfMonths === 2 && (
                                    <div className="w-[200px] border-r border-white/5 bg-[#111114] p-6 flex flex-col gap-1 overflow-y-auto">
                                        {dateRanges.map(({ label, start, end }) => (
                                            <button
                                                key={label}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all text-left",
                                                    selectedRange === label
                                                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                                                        : "text-zinc-500 hover:text-white hover:bg-white/5"
                                                )}
                                                onClick={() => {
                                                    selectDateRange(start, end, label);
                                                    setMonthFrom(start);
                                                    setYearFrom(start.getFullYear());
                                                    setMonthTo(end);
                                                    setYearTo(end.getFullYear());
                                                }}
                                            >
                                                <Clock className={cn("h-4 w-4", selectedRange === label ? "text-white" : "text-zinc-600")} />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex flex-col flex-1 bg-[#0c0c0e]">
                                    <div className="p-6 border-b border-white/5 bg-[#111114] flex items-center justify-between px-8">
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    onValueChange={(value) => {
                                                        handleMonthChange(months.indexOf(value), "from");
                                                    }}
                                                    value={monthFrom ? months[monthFrom.getMonth()] : undefined}
                                                >
                                                    <SelectTrigger className="w-[140px] bg-zinc-900 border-white/5 text-zinc-300 h-9 rounded-lg">
                                                        <SelectValue placeholder="Month" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                        {months.map((month, idx) => (
                                                            <SelectItem key={idx} value={month}>{month}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Select
                                                    onValueChange={(value) => {
                                                        handleYearChange(Number(value), "from");
                                                    }}
                                                    value={yearFrom ? yearFrom.toString() : undefined}
                                                >
                                                    <SelectTrigger className="w-[100px] bg-zinc-900 border-white/5 text-zinc-300 h-9 rounded-lg">
                                                        <SelectValue placeholder="Year" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                        {years.map((year, idx) => (
                                                            <SelectItem key={idx} value={year.toString()}>{year}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {numberOfMonths === 2 && (
                                                <>
                                                    <div className="text-zinc-700 mx-2">—</div>
                                                    <div className="flex items-center gap-2">
                                                        <Select
                                                            onValueChange={(value) => {
                                                                handleMonthChange(months.indexOf(value), "to");
                                                            }}
                                                            value={monthTo ? months[monthTo.getMonth()] : undefined}
                                                        >
                                                            <SelectTrigger className="w-[140px] bg-zinc-900 border-white/5 text-zinc-300 h-9 rounded-lg">
                                                                <SelectValue placeholder="Month" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                                {months.map((month, idx) => (
                                                                    <SelectItem key={idx} value={month}>{month}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Select
                                                            onValueChange={(value) => {
                                                                handleYearChange(Number(value), "to");
                                                            }}
                                                            value={yearTo ? yearTo.toString() : undefined}
                                                        >
                                                            <SelectTrigger className="w-[100px] bg-zinc-900 border-white/5 text-zinc-300 h-9 rounded-lg">
                                                                <SelectValue placeholder="Year" />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                                                {years.map((year, idx) => (
                                                                    <SelectItem key={idx} value={year.toString()}>{year}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleClose}
                                            className="text-zinc-500 hover:text-white hover:bg-white/5 rounded-full"
                                        >
                                            <ChevronDown className="h-5 w-5 rotate-180" />
                                        </Button>
                                    </div>

                                    <div className="flex-1 flex items-center justify-center p-8">
                                        <Calendar
                                            mode="range"
                                            defaultMonth={monthFrom}
                                            month={monthFrom}
                                            onMonthChange={setMonthFrom}
                                            selected={date}
                                            onSelect={handleDateSelect}
                                            numberOfMonths={numberOfMonths}
                                            showOutsideDays={false}
                                            className="p-0 scale-110"
                                            components={{
                                                // @ts-ignore
                                                Caption: () => null
                                            }}
                                        />
                                    </div>

                                    <div className="p-6 border-t border-white/5 bg-[#111114]/50 flex items-center justify-end gap-3 px-8">
                                        <button
                                            onClick={handleClose}
                                            className="text-sm font-medium text-zinc-500 hover:text-white transition-colors px-6 py-2 rounded-xl hover:bg-white/5"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleClose}
                                            className="bg-orange-500 text-white px-8 py-2.5 rounded-2xl text-sm font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/25 active:scale-95"
                                        >
                                            {numberOfMonths === 2 ? "Apply Range" : "Confirm Date"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        );
    }
);

CalendarDatePicker.displayName = "CalendarDatePicker";
