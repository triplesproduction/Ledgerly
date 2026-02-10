
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Raw Data from Screenshot
const rawData = [
    { date: '13/01/2025', client: 'Muktaa Global', amount: 5000, description: 'Website MGA' },
    { date: '17/01/2025', client: 'Nature Leaf', amount: 5000, description: 'Logo & Packaging' }, // Normalized "Natuer Leaf"
    { date: '19/01/2025', client: 'Dipika Doshi', amount: 1000, description: 'Photoshoot Adv.' },
    { date: '19/01/2025', client: 'Aditi Interior Designer', amount: 2000, description: 'Digital Marketing' },
    { date: '23/01/2025', client: 'Nature Leaf', amount: 15000, description: 'Website Development' },
    { date: '24/01/2025', client: 'General Rubber Product', amount: 10000, description: 'Documentary Video' },
    { date: '27/01/2025', client: 'Nature Leaf', amount: 2000, description: 'Website Copywriting' },
    { date: '29/01/2025', client: 'Dipika Doshi', amount: 500, description: 'Photoshoot' },
];

// Map of screenshot names to potential DB names (if known/different)
const clientNameMapping: Record<string, string> = {
    'Muktaa Global': 'Mukta Global Associates',
    // 'Nature Leaf' will be created if not exists
    // 'Dipika Doshi' will be created if not exists
    // 'Aditi Interior Designer' will be created if not exists
    // 'General Rubber Product' will be created if not exists
};

async function parseDate(dateStr: string): Promise<string> {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
}

async function getOrCreateClient(name: string): Promise<string | null> {
    const targetName = clientNameMapping[name] || name;

    // Check if exists
    const { data: existing, error: fetchError } = await supabase
        .from('clients')
        .select('id, name')
        .ilike('name', targetName) // Case-insensitive match
        .maybeSingle();

    if (fetchError) {
        console.error(`Error fetching client ${targetName}:`, fetchError.message);
        return null;
    }

    if (existing) {
        console.log(`Found existing client: ${existing.name} (${existing.id})`);
        return existing.id;
    }

    // Create new
    console.log(`Creating new client: ${targetName}`);
    const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert([{ name: targetName, status: 'Active' }]) // Default status
        .select()
        .single();

    if (createError) {
        console.error(`Error creating client ${targetName}:`, createError.message);
        return null;
    }

    return newClient.id;
}

async function main() {
    console.log('Starting Historical Data Import...');

    for (const entry of rawData) {
        const clientId = await getOrCreateClient(entry.client);

        if (!clientId) {
            console.warn(`Skipping entry for ${entry.client} (Could not resolve ID)`);
            continue;
        }

        const formattedDate = await parseDate(entry.date);

        // Check for duplicates (same client, date, amount, description)
        const { data: duplicates, error: dupError } = await supabase
            .from('income')
            .select('id')
            .eq('client_id', clientId)
            .eq('date', formattedDate)
            .eq('amount', entry.amount)
            .eq('description', entry.description);

        if (dupError) {
            console.error('Error checking duplicates:', dupError.message);
            continue;
        }

        if (duplicates && duplicates.length > 0) {
            console.log(`Duplicate found for ${entry.client} on ${entry.date}. Skipping.`);
            continue;
        }

        // Insert
        const { error: insertError } = await supabase
            .from('income')
            .insert([
                {
                    client_id: clientId,
                    date: formattedDate,
                    amount: entry.amount,
                    description: entry.description,
                },
            ]);

        if (insertError) {
            console.error(`Error inserting entry for ${entry.client}:`, insertError.message);
        } else {
            console.log(`Successfully inserted: ${entry.date} - ${entry.client} - ₹${entry.amount}`);
        }
    }

    console.log('Import Complete.');
}

main().catch(console.error);
