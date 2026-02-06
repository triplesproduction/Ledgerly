/**
 * ⚠️ WARNING: This script will DELETE ALL income and expense records
 * Use only in development for testing purposes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllTransactions() {
    console.log('⚠️  Starting to clear all transactions...');

    // Delete all income entries
    const { error: incomeError } = await supabase
        .from('income')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (incomeError) {
        console.error('❌ Error deleting income:', incomeError);
    } else {
        console.log('✅ Successfully cleared all income entries');
    }

    // Delete all expenses entries
    const { error: expensesError } = await supabase
        .from('expenses')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (expensesError) {
        console.error('❌ Error deleting expenses:', expensesError);
    } else {
        console.log('✅ Successfully cleared all expenses entries');
    }

    console.log('🎉 Transaction clearing complete!');
}

clearAllTransactions()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
