/**
 * ⚠️ WARNING: This script will DELETE ALL receivables (EXPECTED income entries)
 * Use only in development for testing purposes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllReceivables() {
    console.log('⚠️  Starting to clear all receivables (EXPECTED income entries)...');

    // Delete all income entries with EXPECTED status (these are receivables)
    const { error, count } = await supabase
        .from('income')
        .delete({ count: 'exact' })
        .eq('status', 'EXPECTED');

    if (error) {
        console.error('❌ Error deleting receivables:', error);
    } else {
        console.log(`✅ Successfully cleared ${count || 0} receivables entries`);
    }

    console.log('🎉 Receivables clearing complete!');
}

clearAllReceivables()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
