/**
 * Import January 2025 Income Entries
 * Analyzes categories from descriptions and creates clients as needed
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// January 2025 Income Data
const incomeData = [
    {
        date: '2025-01-13',
        client: 'Muktaa Global',
        amount: 5000,
        description: 'Website MGA'
    },
    {
        date: '2025-01-17',
        client: 'Natuer Leaf', // Note: Typo in original, will normalize to "Nature Leaf"
        amount: 5000,
        description: 'Logo & Packaging'
    },
    {
        date: '2025-01-19',
        client: 'Dipika Doshi',
        amount: 1000,
        description: 'Photoshoot Adv.'
    },
    {
        date: '2025-01-19',
        client: 'Aditi Interior Designer',
        amount: 2000,
        description: 'Digital Marketing'
    },
    {
        date: '2025-01-23',
        client: 'Nature Leaf',
        amount: 15000,
        description: 'Website Development'
    },
    {
        date: '2025-01-24',
        client: 'General Rubber Product',
        amount: 10000,
        description: 'Documentary Video'
    },
    {
        date: '2025-01-27',
        client: 'Nature Leaf',
        amount: 2000,
        description: 'Website Copywriting'
    },
    {
        date: '2025-01-29',
        client: 'Dipika Doshi',
        amount: 500,
        description: 'Photoshoot'
    }
];

// Intelligent category inference
function inferCategory(description: string): string {
    const desc = description.toLowerCase();

    if (desc.includes('website') || desc.includes('web')) return 'Web Development';
    if (desc.includes('logo') || desc.includes('packaging')) return 'Design';
    if (desc.includes('photoshoot') || desc.includes('photography')) return 'Photography';
    if (desc.includes('marketing')) return 'Digital Marketing';
    if (desc.includes('video') || desc.includes('documentary')) return 'Video Production';
    if (desc.includes('copywriting') || desc.includes('content')) return 'Content Writing';

    return ''; // Empty if can't determine
}

// Normalize client name (fix typos)
function normalizeClientName(name: string): string {
    if (name === 'Natuer Leaf') return 'Nature Leaf';
    return name;
}

async function getOrCreateClient(clientName: string): Promise<string | null> {
    const normalizedName = normalizeClientName(clientName);

    // Check if client exists
    const { data: existing } = await supabase
        .from('clients')
        .select('id')
        .ilike('name', normalizedName)
        .single();

    if (existing) {
        console.log(`✓ Found existing client: ${normalizedName}`);
        return existing.id;
    }

    // Create new client
    const { data: newClient, error } = await supabase
        .from('clients')
        .insert({
            name: normalizedName,
            status: 'active'
        })
        .select('id')
        .single();

    if (error) {
        console.error(`✗ Error creating client ${normalizedName}:`, error);
        return null;
    }

    console.log(`✓ Created new client: ${normalizedName}`);
    return newClient.id;
}

async function importIncomeEntries() {
    console.log('📥 Starting January 2025 income import...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const entry of incomeData) {
        console.log(`Processing: ${entry.date} - ${entry.client} - ₹${entry.amount}`);

        // Get or create client
        const clientId = await getOrCreateClient(entry.client);
        if (!clientId) {
            console.error(`✗ Failed to get/create client for: ${entry.client}\n`);
            errorCount++;
            continue;
        }

        // Infer category
        const category = inferCategory(entry.description);

        // Insert income entry
        const { error } = await supabase
            .from('income')
            .insert({
                client_id: clientId,
                amount: entry.amount,
                date: entry.date,
                description: entry.description,
                category: category || null, // Keep empty if not inferred
                status: 'RECEIVED (VERIFIED)'
            });

        if (error) {
            console.error(`✗ Error inserting entry:`, error);
            errorCount++;
        } else {
            console.log(`  ✓ Created income entry - Category: ${category || '(empty)'}\n`);
            successCount++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Import complete!`);
    console.log(`   Success: ${successCount} entries`);
    console.log(`   Errors: ${errorCount} entries`);
    console.log(`   Total Amount: ₹${incomeData.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}`);
    console.log('='.repeat(50));
}

importIncomeEntries()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
