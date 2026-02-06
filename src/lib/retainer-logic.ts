import { supabase } from "@/lib/supabase";
import { ContractVersion, MilestoneConfig } from "@/types/retainer";
import {
    addDays,
    addMonths,
    endOfMonth,
    format,
    isAfter,
    isBefore,
    parseISO,
    setDate,
    startOfMonth,
    startOfDay
} from "date-fns";

/**
 * 🏭 Retainer Generator Service
 * 
 * Responsible for:
 * 1. Finding Active Contracts
 * 2. Determining the correct Version for a target month
 * 3. Generating the Monthly Instance (if missing)
 * 4. Generating the Milestones (Income entries) based on payment structure
 */
export async function generateRetainerInstances() {
    console.log("🏭 Starting Retainer Generation...");

    // 1. Fetch Active Contracts
    const { data: contracts, error } = await supabase
        .from('retainer_contracts')
        .select('*')
        .eq('status', 'active');

    if (error || !contracts) {
        console.error("Error fetching contracts:", error);
        return;
    }

    const today = startOfDay(new Date());
    // Generate for Current Month and Next Month
    const targetMonths = [
        startOfMonth(today),
        startOfMonth(addMonths(today, 1))
    ];

    for (const contract of contracts) {
        // Fetch Versions for this contract
        const { data: versions } = await supabase
            .from('contract_versions')
            .select('*')
            .eq('contract_id', contract.id)
            .order('effective_start_date', { ascending: true }); // Oldest to Newest

        if (!versions || versions.length === 0) continue;

        // Dynamic Range: Start from the earliest version's effective date
        // Since we ordered ascending, versions[0] is the oldest.
        const earliestDate = parseISO(versions[0].effective_start_date);
        let iteratorDate = startOfMonth(earliestDate);

        // We generate up to next month (relative to today)
        const cutoffDate = startOfMonth(addMonths(today, 1));

        while (!isAfter(iteratorDate, cutoffDate)) {
            const monthStart = iteratorDate;

            // 2. Determine Version for this Month
            // Value is applicable if: monthStart >= effective_start && (no end or monthStart <= effective_end)
            // Since we sorted asc, we can find the *latest* matching version.
            const validVersion = versions.slice().reverse().find((v: ContractVersion) => {
                const start = parseISO(v.effective_start_date);
                const end = v.effective_end_date ? parseISO(v.effective_end_date) : null;

                // Using startOfMonth comparisons
                const isStarted = !isBefore(monthStart, startOfMonth(start));
                const isNotEnded = !end || !isAfter(monthStart, endOfMonth(end));

                return isStarted && isNotEnded;
            });

            // Increment loop for next iteration at the end (or continue)
            // Function to advance iterator
            const next = () => { iteratorDate = addMonths(iteratorDate, 1); };

            if (!validVersion) {
                // No active pricing version for this month
                next();
                continue;
            }

            // 3. Idempotency Check
            // Check if instance exists for this Version + Month
            const { count } = await supabase
                .from('monthly_instances')
                .select('id', { count: 'exact', head: true })
                .eq('contract_version_id', validVersion.id)
                .eq('month_date', format(monthStart, 'yyyy-MM-dd'));

            if (count && count > 0) {
                // Already generated
                next();
                continue;
            }

            // 4. Generate Instance & Milestones

            // A. Create Instance
            const { data: instance, error: instError } = await supabase
                .from('monthly_instances')
                .insert({
                    contract_version_id: validVersion.id,
                    month_date: format(monthStart, 'yyyy-MM-dd'),
                    total_due: validVersion.monthly_price,
                    status: 'generated'
                })
                .select()
                .single();

            if (instError || !instance) {
                console.error("Failed to create instance:", {
                    error: instError,
                    errorMessage: instError?.message,
                    errorDetails: instError?.details,
                    errorHint: instError?.hint,
                    errorCode: instError?.code,
                    contractId: contract.id,
                    contractName: contract.name,
                    versionId: validVersion.id,
                    monthDate: format(monthStart, 'yyyy-MM-dd'),
                    totalDue: validVersion.monthly_price,
                    paymentStructure: validVersion.payment_structure
                });
                next();
                continue;
            }

            // B. Calculate Milestones
            const milestones = calculateMilestones(validVersion.monthly_price, validVersion.payment_structure || [], monthStart);

            // C. Insert Milestones (Income)
            const incomeEntries = milestones.map(m => ({
                retainer_instance_id: instance.id,
                client_id: contract.client_id,
                service_id: contract.service_id,
                amount: m.amount,
                date: m.date,
                description: `${contract.name} - ${m.name}`,
                category: 'Retainer',
                status: 'EXPECTED',
                milestone_label: m.name
            }));

            if (incomeEntries.length > 0) {
                const { error: incError } = await supabase.from('income').insert(incomeEntries);
                if (incError) console.error("Failed to insert milestones:", incError);
            }

            // Move to next month
            next();
        }
    }
}

function calculateMilestones(total: number, structure: MilestoneConfig[], baseDate: Date) {
    // If no structure, default to 100% upfront
    if (!structure || structure.length === 0) {
        return [{
            name: "Full Payment",
            amount: total,
            date: format(baseDate, 'yyyy-MM-dd')
        }];
    }

    let remaining = total;
    const results = [];

    // Process non-remainder items first
    for (const step of structure) {
        if (step.type === 'remainder') continue;

        let amount = 0;
        if (step.type === 'fixed') amount = step.value || 0;
        if (step.type === 'percent') amount = (total * (step.value || 0)) / 100;

        results.push({
            name: step.name,
            amount: amount,
            date: format(addDays(baseDate, step.day_offset), 'yyyy-MM-dd')
        });
        remaining -= amount;
    }

    // Process remainder
    const remainderStep = structure.find(s => s.type === 'remainder');
    if (remainderStep) {
        results.push({
            name: remainderStep.name,
            amount: remaining, // Whatever is left
            date: format(addDays(baseDate, remainderStep.day_offset), 'yyyy-MM-dd')
        });
    }

    return results;
}
