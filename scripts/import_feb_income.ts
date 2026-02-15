
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

// Raw Data from Image
const rawData = [
    { date: '03/02/2025', client: 'Vidya Pawar', amount: 1500, description: 'Photoshoot' },
    { date: '12/02/2025', client: 'General Rubber Product', amount: 10000, description: 'Documentary Video' },
    { date: '14/02/2025', client: 'Jayvardhan Patil', amount: 1300, description: 'Invitation card & video' },
    { date: '15/02/2025', client: 'Prathmesh FC', amount: 1000, description: 'Video Editing' },
    { date: '19/02/2025', client: 'Aditi Interior Designer', amount: 5000, description: 'Digital Marketing' }
];

async function parseDate(dateStr: string): Promise<string> {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
}

async function getOrCreateClient(name: string): Promise<string | null> {
    const targetName = name.trim();

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
    console.log('Starting February Income Data Import...');

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
                    status: 'RECEIVED', // Defaulting to RECEIVED as per previous imports
                    payment_method: 'bank' // Defaulting to bank or maybe I should leave it null? previous script didn't set it but I just fixed a bug about it. 
                    // Wait, the previous script didn't set payment_method. 
                    // The schema has it as nullable? 
                    // Use 'bank' as safe default since I made it required in the UI form state but not in DB.
                    // Actually I should probably check if I can infer it. 
                    // The image doesn't say payment method. I'll default to 'bank'.
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
