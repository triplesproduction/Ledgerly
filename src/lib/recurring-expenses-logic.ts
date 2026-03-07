
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
        // Fetch Versions for this rule
        const { data: versions } = await supabase
            .from('recurring_expense_versions')
            .select('*')
            .eq('recurring_rule_id', rule.id)
            .order('effective_from', { ascending: true });

        // If no versions found, fallback to rule.amount (migration safety)
        const fallbackAmount = rule.amount;

        for (const monthStart of targetMonths) {
            // A. Validate Rule Validity Period
            const ruleStart = parseISO(rule.start_month);
            if (isBefore(monthStart, startOfMonth(ruleStart))) continue;

            if (rule.end_month) {
                const ruleEnd = parseISO(rule.end_month);
                if (isAfter(monthStart, endOfMonth(ruleEnd))) continue;
            }

            // B. Determine Amount from Version
            let amount = fallbackAmount;
            if (versions && versions.length > 0) {
                // Find the latest version effective BEFORE or ON this month
                const activeVersion = versions.slice().reverse().find((v: any) => {
                    const effectiveDate = parseISO(v.effective_from);
                    return !isAfter(startOfMonth(effectiveDate), monthStart);
                });

                if (activeVersion) {
                    amount = activeVersion.amount;
                }
            }

            // C. Calculate Due Date
            const daysInMonth = endOfMonth(monthStart).getDate();
            const dueDay = Math.min(rule.due_day, daysInMonth);
            const expectedDate = setDate(monthStart, dueDay);
            const expectedDateStr = format(expectedDate, 'yyyy-MM-dd');

            // D. Idempotency Check
            const { count } = await supabase
                .from('expenses')
                .select('id', { count: 'exact', head: true })
                .eq('recurring_rule_id', rule.id)
                .gte('date', format(startOfMonth(monthStart), 'yyyy-MM-dd'))
                .lte('date', format(endOfMonth(monthStart), 'yyyy-MM-dd'));

            if (count && count > 0) continue;

            // E. Generate Instance
            const { error: insertError } = await supabase
                .from('expenses')
                .insert({
                    recurring_rule_id: rule.id,
                    date: expectedDateStr,
                    amount: amount, // Use versioned amount
                    description: `${rule.name} (Recurring)`,
                    vendor: rule.vendor,
                    category: rule.category,
                    payment_method: rule.payment_method,
                    status: 'SCHEDULED'
                });

            if (insertError) {
                console.error(`Failed to generate expense for ${rule.name}:`, insertError);
            }
        }
    }
}
