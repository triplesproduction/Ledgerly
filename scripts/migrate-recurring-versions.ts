
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function migrate() {
    console.log("🚀 Starting Migration: Recurring Expense Versions...");

    // 1. Get all rules
    const { data: rules, error } = await supabase.from('recurring_expense_rules').select('*');
    if (error) {
        console.error("Error fetching rules:", error);
        return;
    }

    console.log(`Found ${rules.length} rules.`);

    for (const rule of rules) {
        // 2. Check if version exists to avoid duplicates
        const { count } = await supabase
            .from('recurring_expense_versions')
            .select('id', { count: 'exact', head: true })
            .eq('recurring_rule_id', rule.id);

        if (count && count > 0) {
            console.log(`Skipping ${rule.name} (Versions exist)`);
            continue;
        }

        // 3. Insert V1
        // Use start_month as effective_from. If null (shouldn't be), use today.
        const effectiveFrom = rule.start_month || new Date().toISOString();

        const { error: insertError } = await supabase
            .from('recurring_expense_versions')
            .insert({
                recurring_rule_id: rule.id,
                amount: rule.amount,
                effective_from: effectiveFrom
            });

        if (insertError) {
            console.error(`❌ Failed to migrate ${rule.name}:`, insertError);
        } else {
            console.log(`✅ Migrated ${rule.name} (Amount: ${rule.amount}, Start: ${effectiveFrom})`);
        }
    }
    console.log("🎉 Migration Complete!");
}

migrate();
