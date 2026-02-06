"use client"

import * as React from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { isValid, startOfMonth, endOfMonth } from "date-fns"
import { DateRange } from "react-day-picker"
import { CalendarDatePicker } from "./calendar-date-picker"

interface DateFilterProps {
    className?: string
}

export function NewDateFilter({ className }: DateFilterProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // --- Applied State from URL ---
    const getAppliedRange = (): DateRange => {
        const fromParam = searchParams.get('from')
        const toParam = searchParams.get('to')

        if (fromParam && toParam) {
            const from = new Date(fromParam)
            const to = new Date(toParam)
            if (isValid(from) && isValid(to)) {
                return { from, to }
            }
        }

        const now = new Date()
        return { from: startOfMonth(now), to: endOfMonth(now) }
    }

    const appliedRange = getAppliedRange()

    // When a date is selected, we update the URL
    const handleDateSelect = (range: { from: Date; to: Date }) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set("from", range.from.toISOString())
        params.set("to", range.to.toISOString())
        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <CalendarDatePicker
            date={appliedRange}
            onDateSelect={handleDateSelect}
            className={className}
            numberOfMonths={2}
            variant="outline"
        />
    )
}
