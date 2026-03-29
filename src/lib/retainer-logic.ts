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
    // Generate for Current Month and up to 4 months ahead (to support 90-day forecasts)
    const cutoffDate = startOfMonth(addMonths(today, 4));

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

        while (!isAfter(iteratorDate, cutoffDate)) {
            const monthStart = iteratorDate;

            // 2. Determine Version for this Month
            const validVersion = versions.slice().reverse().find((v: ContractVersion) => {
                const start = parseISO(v.effective_start_date);
                const end = v.effective_end_date ? parseISO(v.effective_end_date) : null;

                const isStarted = !isBefore(monthStart, startOfMonth(start));
                const isNotEnded = !end || !isAfter(monthStart, endOfMonth(end));

                return isStarted && isNotEnded;
            });

            // Increment loop for next iteration at the end (or continue)
            const next = () => { iteratorDate = addMonths(iteratorDate, 1); };

            if (!validVersion) {
                next();
                continue;
            }

            // 3. Idempotency Check
            const versionIds = versions.map((v: ContractVersion) => v.id);
            const { count } = await supabase
                .from('monthly_instances')
                .select('id', { count: 'exact', head: true })
                .in('contract_version_id', versionIds)
                .gte('month_date', format(startOfMonth(monthStart), 'yyyy-MM-dd'))
                .lte('month_date', format(endOfMonth(monthStart), 'yyyy-MM-dd'));

            if (count && count > 0) {
                next();
                continue;
            }

            // 4. Generate Instance & Milestones
            const isFutureMonth = isAfter(startOfMonth(monthStart), startOfMonth(new Date()));
            
            const { data: instanceData, error: instError } = await supabase
                .from('monthly_instances')
                .insert({
                    contract_version_id: validVersion.id,
                    month_date: format(monthStart, 'yyyy-MM-dd'),
                    total_due: validVersion.monthly_price,
                    status: isFutureMonth ? 'scheduled' : 'generated'
                })
                .select();

            const instance = instanceData?.[0];

            if (instError || !instance) {
                console.error("Failed to create instance:", instError);
                next();
                continue;
            }

            // Cleanup any existing orphan milestones
            await supabase.from('income')
                .delete()
                .eq('client_id', contract.client_id)
                .eq('service_id', contract.service_id)
                .gte('date', format(startOfMonth(monthStart), 'yyyy-MM-dd'))
                .lte('date', format(endOfMonth(monthStart), 'yyyy-MM-dd'))
                .in('status', ['PENDING', 'OVERDUE']);

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
                status: 'PENDING',
                milestone_label: m.name
            }));

            if (incomeEntries.length > 0) {
                const { error: incError } = await supabase.from('income').insert(incomeEntries);
                if (incError) console.error("Failed to insert milestones:", incError);
            }

            next();
        }
    }
}

export function calculateMilestones(total: number, structure: MilestoneConfig[], baseDate: Date) {
    if (!structure || structure.length === 0) {
        return [{
            name: "Full Payment",
            amount: total,
            date: format(baseDate, 'yyyy-MM-dd')
        }];
    }

    let remaining = total;
    const results = [];

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

    const remainderStep = structure.find(s => s.type === 'remainder');
    if (remainderStep) {
        results.push({
            name: remainderStep.name,
            amount: remaining,
            date: format(addDays(baseDate, remainderStep.day_offset), 'yyyy-MM-dd')
        });
    }

    return results;
}
