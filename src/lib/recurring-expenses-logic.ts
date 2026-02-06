
import { supabase } from "@/lib/supabase";
import { addMonths, startOfMonth, endOfMonth, format, setDate, isAfter, isBefore, parseISO, startOfDay } from "date-fns";

/**
 * 💸 Recurring Expense Generator
 * 
 * Scans active `recurring_expense_rules` and generates actual `expenses` records
 * for the current and next month if they don't exist.
 */
export async function generateExpenseInstances() {
    console.log("💸 Starting Expense Generation...");

    // 1. Fetch Active Rules
    const { data: rules, error } = await supabase
        .from('recurring_expense_rules')
        .select('*')
        .eq('active', true);

    if (error || !rules) {
        console.error("Error fetching expense rules:", error);
        return;
    }

    const today = startOfDay(new Date());
    const targetMonths = [
        startOfMonth(today),
        startOfMonth(addMonths(today, 1))
    ];

    for (const rule of rules) {
        for (const monthStart of targetMonths) {
            // A. Validate Rule Validity Period
            const ruleStart = parseISO(rule.start_month);
            // If month is before the rule starts, skip
            if (isBefore(monthStart, startOfMonth(ruleStart))) continue;

            // If rule has an end date and month is after it, skip
            if (rule.end_month) {
                const ruleEnd = parseISO(rule.end_month);
                if (isAfter(monthStart, endOfMonth(ruleEnd))) continue;
            }

            // B. Calculate Due Date for this Month
            // Handle edge cases like Feb 30th -> Feb 28th/29th automatically by setDate? 
            // setDate(date, 31) in Feb results in March 3rd etc. We want clamping.
            // Let's use string manipulation or a safer set operation.
            // Simple approach: Construct string YYYY-MM-DD then parse, if invalid, fallback to last day?
            // Actually, best check:
            const daysInMonth = endOfMonth(monthStart).getDate();
            const dueDay = Math.min(rule.due_day, daysInMonth);
            const expectedDate = setDate(monthStart, dueDay);
            const expectedDateStr = format(expectedDate, 'yyyy-MM-dd');

            // C. Idempotency Check
            // Check if an expense exists for this rule in this month
            // We search for any expense with this rule_id where date is within this month
            const { count } = await supabase
                .from('expenses')
                .select('id', { count: 'exact', head: true })
                .eq('recurring_rule_id', rule.id)
                .gte('date', format(startOfMonth(monthStart), 'yyyy-MM-dd'))
                .lte('date', format(endOfMonth(monthStart), 'yyyy-MM-dd'));

            if (count && count > 0) {
                // Already exists (paid, pending, or scheduled)
                continue;
            }

            // D. Generate Instance


            const { error: insertError } = await supabase
                .from('expenses')
                .insert({
                    recurring_rule_id: rule.id,
                    date: expectedDateStr,
                    amount: rule.amount,
                    description: `${rule.name} (Recurring)`,
                    vendor: rule.vendor,
                    category: rule.category,
                    payment_method: rule.payment_method,
                    status: 'SCHEDULED' // Distinct from PENDING, implies system-generated future
                });

            if (insertError) {
                console.error(`Failed to generate expense for ${rule.name}:`, insertError);
            }
        }
    }
}
