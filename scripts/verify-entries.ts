/**
 * Verify January 2025 Income Entries
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyEntries() {
    console.log('🔍 Checking database for January 2025 entries...\n');

    // Check all income entries
    const { data: allIncome, error: allError } = await supabase
        .from('income')
        .select('*')
        .order('date', { ascending: false });

    if (allError) {
        console.error('Error fetching income:', allError);
        return;
    }

    console.log(`📊 Total income entries in database: ${allIncome?.length || 0}\n`);

    if (allIncome && allIncome.length > 0) {
        console.log('Recent entries:');
        allIncome.slice(0, 10).forEach((entry: any) => {
            console.log(`  - ${entry.date}: ₹${entry.amount} - ${entry.description} (Status: ${entry.status})`);
        });

        // Check specifically for January 2025
        const jan2025 = allIncome.filter((e: any) => e.date?.startsWith('2025-01'));
        console.log(`\n📅 January 2025 entries: ${jan2025.length}`);

        if (jan2025.length > 0) {
            console.log('January 2025 breakdown:');
            jan2025.forEach((entry: any) => {
                console.log(`  - ${entry.date}: ₹${entry.amount} - ${entry.description}`);
            });
        }
    } else {
        console.log('⚠️  No income entries found in database!');
    }
}

verifyEntries()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
