import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanPausedExpenses() {
    const { data: rules } = await supabase.from('recurring_expense_rules').select('id, active');
    
    if (rules) {
        for (const rule of rules) {
            if (!rule.active) {
                console.log(`Cleaning paused rule: ${rule.id}`);
                const { error } = await supabase
                    .from('expenses')
                    .delete()
                    .eq('recurring_rule_id', rule.id)
                    .eq('status', 'SCHEDULED');
                if (error) console.error(error);
            }
        }
    }
}

cleanPausedExpenses();
