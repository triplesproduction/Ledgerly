/**
 * 🧹 PRODUCTION CLEANUP SCRIPT
 * ⚠️ WARNING: This will DELETE ALL DATA from the application
 * 
 * This script clears:
 * - All income entries
 * - All expense entries
 * - All clients
 * - All services
 * - All employees
 * - All retainer contracts and versions
 * - All monthly instances
 * - All recurring rules
 * 
 * Use this ONLY when preparing for production deployment
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface CleanupResult {
    table: string;
    count: number;
    success: boolean;
    error?: string;
}

async function clearTable(tableName: string): Promise<CleanupResult> {
    try {
        const { error, count } = await supabase
            .from(tableName)
            .delete({ count: 'exact' })
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

        if (error) {
            // Table might not exist, which is okay
            return { table: tableName, count: 0, success: false, error: error.message };
        }

        return { table: tableName, count: count || 0, success: true };
    } catch (err: any) {
        return { table: tableName, count: 0, success: false, error: err.message };
    }
}

async function cleanupProduction() {
    console.log('🧹 PRODUCTION CLEANUP STARTING...');
    console.log('⚠️  This will DELETE ALL DATA from the application!\n');

    const results: CleanupResult[] = [];

    // Order matters! Delete child records before parent records
    const tablesToClean = [
        // Transactional Data (delete first)
        'income',
        'expenses',

        // Retainer System
        'monthly_instances',
        'contract_versions',
        'retainer_contracts',

        // Recurring Rules
        'recurring_rules',

        // Master Data
        'employees',
        'clients',
        'services',

        // Additional tables (if they exist)
        'payments',
        'invoices',
        'quotations',
    ];

    console.log('📋 Tables to clean:');
    tablesToClean.forEach(table => console.log(`   - ${table}`));
    console.log('');

    for (const table of tablesToClean) {
        process.stdout.write(`Cleaning ${table}...`);
        const result = await clearTable(table);
        results.push(result);

        if (result.success) {
            console.log(` ✅ ${result.count} records deleted`);
        } else {
            console.log(` ⚠️  ${result.error || 'Table not found'}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success);
    const totalDeleted = successful.reduce((sum, r) => sum + r.count, 0);

    console.log(`Total tables processed: ${results.length}`);
    console.log(`Successful deletions: ${successful.length}`);
    console.log(`Total records deleted: ${totalDeleted}`);
    console.log('='.repeat(60));

    if (successful.length > 0) {
        console.log('\n✅ Database is now clean and ready for production!');
        console.log('📝 Next steps:');
        console.log('   1. Verify the app loads correctly');
        console.log('   2. Test core functionality');
        console.log('   3. Deploy to production');
    } else {
        console.log('\n⚠️  No data was deleted. Database might already be clean.');
    }
}

cleanupProduction()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
