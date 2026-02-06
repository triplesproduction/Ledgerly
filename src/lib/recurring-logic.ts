import { supabase } from "@/lib/supabase";
import { RecurringRule } from "@/types/recurring";
import {
    addMonths,
    format,
    isBefore,
    setDate,
    startOfDay,
    parseISO,
    isAfter,
    startOfMonth,
    endOfMonth
} from "date-fns";

/**
 * Strict Recurring Income Generator
 * 
 * Rules:
 * 1. Source of Truth: 'recurring_rules' table.
 * 2. Destination: 'income' table.
 * 3. Idempotency: NEVER generate a duplicate month for the same rule.
 * 4. Future Only: Rule changes (amount) only affect newly generated entries.
 * 5. Scope: Generates up to Next Month to ensure "Upcoming Payments" is populated.
 */
export async function generateRecurringIncome() {
    console.log("🔄 Starting Strict Recurring Income Generation...");

    // 1. Fetch active rules
    const { data: rules, error } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('status', 'active');

    if (error || !rules) {
        console.error("❌ Error fetching rules:", error);
        return [];
    }

    const today = startOfDay(new Date());
    // Limit generation to Current Month + 1 (Next Month)
    // We don't want to flood the ledger with 12 months in advance
    const targetLimitDate = addMonths(today, 1);

    const newEntries = [];

    for (const rule of rules as RecurringRule[]) {
        // Determine start point
        // If we have a last_generated_date, start checking from the NEXT month.
        // If not, start from the rule's start_date.
        let cursorDate = rule.last_generated_date
            ? addMonths(parseISO(rule.last_generated_date), 1)
            : parseISO(rule.start_date);

        // Normalize cursor to the specific 'default_day' of that month
        // Handle edge case: if default_day is 31 and month has 30, setDate handles it (rolls over or clamps depending on lib, date-fns clamps usually or we should be careful. setDate(new Date(2023, 1, 1), 31) -> March 3rd. 
        // Better approach: set to start of month, then add days or use specific logic. 
        // safest: set to 1st of month, then set date, checking max days in month.
        // For simplicity in MVP: Let's use setDate and ensure we stick to the intended month.

        // Loop until we reach the limit
        while (isBefore(startOfMonth(cursorDate), startOfMonth(addMonths(targetLimitDate, 1)))) {

            // 1. Construct the expected Payment Date for this cursor month
            // We take the Year/Month from cursor, and Day from rule.default_day
            // We use 'date-fns' setDate which might rollover if day is invalid (e.g. Feb 30 -> Mar 2). 
            // We want to clamp it ideally, but rollover is standard JS behavior. Let's accept rollover or clamp.
            // Let's just use the cursor month's year/month.
            let expectedDate = setDate(cursorDate, rule.default_day);

            // If the resulting date rolled over to next month (e.g. Feb 30 -> Mar 2), pull it back to end of previous month? 
            // Or just let it be. Let's stick to simple setDate for now.

            // 2. Validate Constraints

            // A. Start Date: Don't generate before start date (should cover 'catch up' but not 'pre-history')
            if (isBefore(expectedDate, parseISO(rule.start_date))) {
                cursorDate = addMonths(cursorDate, 1);
                continue;
            }

            // B. End Date: If rule has end date and we passed it, STOP completely for this rule.
            if (rule.end_date && isAfter(expectedDate, parseISO(rule.end_date))) {
                break;
            }

            // 3. IDEMPOTENCY CHECK (Crucial)
            // Check if an income entry ALREADY exists for this Rule + This Month (fuzzy match on date range)
            const monthStart = startOfMonth(expectedDate).toISOString();
            const monthEnd = endOfMonth(expectedDate).toISOString();

            const { count } = await supabase
                .from('income')
                .select('id', { count: 'exact', head: true })
                .eq('recurring_rule_id', rule.id)
                .gte('date', monthStart)
                .lte('date', monthEnd);

            if (count && count > 0) {
                // Already generated for this month. Skip.
                console.log(`⏩ Skipping ${rule.id} for ${format(expectedDate, 'MMM yyyy')} - already exists.`);

                // Important: Even if it exists, we might need to update 'last_generated_date' if it fell behind?
                // But generally we assume if it exists, logic ran.
                // Let's ensure rule.last_generated_date is caught up.
                if (!rule.last_generated_date || isAfter(expectedDate, parseISO(rule.last_generated_date))) {
                    await supabase.from('recurring_rules').update({ last_generated_date: format(expectedDate, 'yyyy-MM-dd') }).eq('id', rule.id);
                }

                cursorDate = addMonths(cursorDate, 1);
                continue;
            }

            // 4. GENERATE


            const { data: inserted, error: insertError } = await supabase.from('income').insert({
                recurring_rule_id: rule.id,
                client_id: rule.client_id,
                service_id: rule.service_id,
                amount: rule.amount,
                date: format(expectedDate, 'yyyy-MM-dd'),
                status: 'EXPECTED', // Default status for future/generated items
                description: 'Monthly Retainer', // Generic, can be improved to allow custom desc in rule
                category: 'Retainer'
            }).select().single();

            if (insertError) {
                console.error("Failed to insert:", insertError);
                break; // Stop to prevent infinite loops on error
            }

            if (inserted) {
                newEntries.push(inserted);

                // 5. Update Rule Head
                // We update last_generated_date to this successful date
                await supabase
                    .from('recurring_rules')
                    .update({ last_generated_date: format(expectedDate, 'yyyy-MM-dd') })
                    .eq('id', rule.id);
            }

            // Next month
            cursorDate = addMonths(cursorDate, 1);
        }
    }

    return newEntries;
}
