
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

// Raw Data from Images
const rawData = [
    // February 2025
    { date: '03/02/2025', client: 'Vidya Pawar', amount: 1500, description: 'Photoshoot' },
    { date: '12/02/2025', client: 'General Rubber Product', amount: 10000, description: 'Documentary Video' },
    { date: '14/02/2025', client: 'Jayvardhan Patil', amount: 1300, description: 'Invitation card & video' },
    { date: '15/02/2025', client: 'Prathmesh FC', amount: 1000, description: 'Video Editing' },
    { date: '19/02/2025', client: 'Aditi Interior Designer', amount: 5000, description: 'Digital Marketing' },

    // March 2025
    { date: '02/03/2025', client: 'Rohan FC', amount: 400, description: 'Video Editing' },
    { date: '02/03/2025', client: 'Radha Enterprises', amount: 2200, description: 'Festival Poster' },
    { date: '02/03/2025', client: 'Aromastra', amount: 5000, description: 'Startup Kit Adv.' },
    { date: '05/03/2025', client: 'Muktaa Global', amount: 500, description: 'Website MGA' },
    { date: '08/03/2025', client: 'Muktaa Global', amount: 5000, description: 'Website MGA' },
    { date: '20/03/2025', client: 'SJ Associates', amount: 650, description: 'Poster Design' },
    { date: '21/03/2025', client: 'RX Hiring Agency', amount: 10000, description: 'Startup Kit Booking' },
    { date: '22/03/2025', client: 'Viraj Dog house', amount: 400, description: 'Poster Design' },
    { date: '23/03/2025', client: 'Viraj Dog house', amount: 400, description: 'Poster Design' },
    { date: '21/03/2025', client: 'General Rubber Product', amount: 3100, description: 'Brochure & Pendrive' },
    { date: '31/03/2025', client: 'CFA Cat show', amount: 1500, description: 'Brochure Adv.' },

    // April 2025
    { date: '01/04/2025', client: 'CFA Cat show', amount: 1500, description: 'Brochure Adv.' },
    { date: '03/04/2025', client: 'Muktaa Global', amount: 500, description: 'Website maintance' },
    { date: '05/04/2025', client: 'Radika chowk mandal', amount: 300, description: 'Poster Design' },
    { date: '06/04/2025', client: 'Earthly Flavours', amount: 10000, description: 'Website Development' },
    { date: '08/04/2025', client: 'CFA Cat show', amount: 1000, description: 'Brochure Final' },
    { date: '12/04/2025', client: 'Vyanjan Restaurant', amount: 200, description: 'Banner & Flyer Adv.' },
    { date: '13/04/2025', client: 'RX Hiring Agency', amount: 5000, description: 'Startup Kit Installment 2' },
    { date: '17/04/2025', client: 'Aditi Interior Designer', amount: 2000, description: 'Digital Marketing' },
    { date: '12/04/2025', client: 'Vyanjan Restaurant', amount: 300, description: 'Banner & Flyer' },
    { date: '20/04/2025', client: 'Aromastra', amount: 5000, description: 'Startup Kit Installment 2' },
    { date: '21/04/2025', client: 'RX Hiring Agency', amount: 5000, description: 'Startup Kit Installment 3' },
    { date: '22/04/2025', client: 'Mass Forge', amount: 2200, description: 'Logo Design' },
    { date: '30/04/2025', client: 'SJ Associates', amount: 650, description: 'Poster Design' },
    { date: '30/04/2025', client: 'Aditi Interior Designer', amount: 2000, description: 'Digital Marketing' },

    // May 2025
    { date: '02/05/2025', client: 'Muktaa Global', amount: 500, description: 'Website maintance' },
    { date: '06/05/2025', client: 'Constrotriat', amount: 3400, description: 'Brochure Adv.' },
    { date: '06/05/2025', client: 'Aromastra', amount: 5000, description: 'Startup Kit Installment 3' },
    { date: '07/05/2025', client: 'RX Hiring Agency', amount: 5000, description: 'Startup Kit Installment 4' },
    { date: '08/05/2025', client: 'SJ Associates', amount: 900, description: 'Poster Design & Video' },
    { date: '08/05/2025', client: 'Nature Leaf', amount: 200, description: 'Website Rent' },
    { date: '14/05/2025', client: 'Yashoda College', amount: 1000, description: 'PPT' },
    { date: '21/05/2025', client: 'Aditi Interior Designer', amount: 3000, description: 'Digital Marketing' },
    { date: '24/05/2025', client: 'Earthly Flavours', amount: 5000, description: 'Website Development 2' },
    { date: '26/05/2025', client: 'Insurance AD', amount: 2000, description: 'Digital Marketing' },
    { date: '27/05/2025', client: 'NetNat', amount: 600, description: 'Website maintance' },

    // June 2025
    { date: '03/06/2025', client: 'Muktaa Global', amount: 500, description: 'Website maintance' },
    { date: '04/06/2025', client: 'SJ Associates', amount: 600, description: 'Poster Design' },
    { date: '06/06/2025', client: 'Skytag Sys', amount: 6600, description: 'Brochure Design' },
    { date: '13/06/2025', client: 'Constrotriat', amount: 3000, description: 'Brochure & Logo- 2' },
    { date: '24/05/2025', client: 'New India Insurance', amount: 2200, description: 'Digital Marketing' }, // Late May Entry
    { date: '18/06/2025', client: 'RX Hiring Agency', amount: 3000, description: 'Startup Kit Installment 5' },
    { date: '19/06/2025', client: 'Nature Leaf', amount: 200, description: 'Website Rent' },
    { date: '19/06/2025', client: 'Nature Leaf', amount: 2500, description: 'Website Updation' },
    { date: '22/06/2025', client: 'Tech Traveller Blend', amount: 1000, description: 'Youtube Video Editing' },
    { date: '22/06/2025', client: 'Advocate Bahulekar', amount: 2000, description: 'Content Creation' },
    { date: '23/06/2025', client: 'Constrotriat', amount: 3500, description: 'Brochure & Logo- 3' },
    { date: '28/06/2025', client: 'Earthly Flavours', amount: 7000, description: 'Website Development 3' },
    { date: '28/06/2025', client: 'Aishwarya sakhre', amount: 250, description: 'Poster Design' },

    // July 2025
    { date: '01/07/2025', client: 'Aromastra', amount: 2000, description: 'Startup Kit Installment 4' },
    { date: '06/07/2025', client: 'Muktaa Global', amount: 500, description: 'Website maintance' },
    { date: '13/07/2025', client: 'Karad Mart', amount: 25000, description: 'Startup Kit Installment 1' },
    { date: '15/07/2025', client: 'Aromastra', amount: 5000, description: 'Startup Kit Installment 5' },
    { date: '19/07/2025', client: 'Eleven Star', amount: 2000, description: 'Logo Design' },
    { date: '19/07/2025', client: 'Ghoda Chap', amount: 1600, description: 'Logo Design & Label' },
    { date: '21/07/2025', client: 'RS Motion', amount: 500, description: 'Brochure Adv.' },
    { date: '23/07/2025', client: 'Constrotriat', amount: 1000, description: 'Brochure & Logo- 4' },
    { date: '23/07/2025', client: 'Nursery Seva', amount: 900, description: 'Video Editing Adv.' },
    { date: '30/07/2025', client: 'HUBN', amount: 250, description: 'Logo Redesign' },
    { date: '31/07/2025', client: 'Yasmeen', amount: 2600, description: 'Packaging Design' },
    { date: '31/07/2025', client: 'RS Motion', amount: 1000, description: 'Brochure Design' },

    // August 2025
    { date: '01/08/2025', client: 'Advocate Bahulekar', amount: 3000, description: 'Content creation' },
    { date: '03/08/2025', client: 'Muktaa Global', amount: 1000, description: 'Website maintance' },
    { date: '03/08/2025', client: 'Eleven Star', amount: 500, description: 'Visiting card & Bag' },
    { date: '04/08/2025', client: 'Relieff', amount: 300, description: 'Flyer Design' },
    { date: '06/08/2025', client: 'RX Hiring Agency', amount: 5000, description: 'Startup Kit Installment 6' },
    { date: '06/08/2025', client: 'RX Hiring Agency', amount: 1600, description: 'Website Hosting' },
    { date: '11/08/2025', client: 'Earthly Flavors', amount: 1300, description: 'Website Hosting' },
    { date: '11/08/2025', client: 'Bolbo Global', amount: 25000, description: 'Startup Kit Installment 1' },
    { date: '12/08/2025', client: 'HUBN', amount: 250, description: 'Logo Redesign' },
    { date: '12/08/2025', client: 'Mangal Interior Designer', amount: 1000, description: 'Logo Design Adv.' },
    { date: '13/08/2025', client: 'Nursery Seva', amount: 900, description: 'Video Editing FP' },
    { date: '14/08/2025', client: 'Pastel Pink', amount: 10000, description: 'Startup Kit Installment 1' },
    { date: '16/08/2025', client: 'Sachin Patil', amount: 250, description: 'Poster Design' },
    { date: '17/08/2025', client: 'Galaxy Spa', amount: 750, description: 'Video Editing Adv.' },
    { date: '18/08/2025', client: 'Aryan Enterprises', amount: 3200, description: 'Brochure & Video' },
    { date: '23/08/2025', client: 'Seema Eng Academy', amount: 350, description: 'GMB Adv.' },
    { date: '27/08/2025', client: 'Yasmeen', amount: 300, description: 'Bag Design' },
    { date: '28/08/2025', client: 'Mangal Interior Designer', amount: 1000, description: 'Logo Design FP' },
    { date: '17/08/2025', client: 'S Square Construction', amount: 1000, description: 'Logo Design Adv.' },
    { date: '28/08/2025', client: 'Galaxy Spa', amount: 750, description: 'Video Editing FP' },
    { date: '30/08/2025', client: 'Nursery Seva', amount: 900, description: 'Video Editing FP' },

    // September 2025
    { date: '03/09/2025', client: 'Nitu Real Estate', amount: 1000, description: 'Logo Design Adv.' },
    { date: '12/09/2025', client: 'Seema Eng Academy', amount: 350, description: 'GMB Adv.' },
    { date: '13/09/2025', client: 'Padar', amount: 8000, description: 'Digital Marketing' },
    { date: '16/09/2025', client: 'Pastel Pink', amount: 7500, description: 'Digital Marketing' },
    { date: '22/09/2025', client: 'Eco Bags', amount: 750, description: 'Bag Commission' },
    { date: '23/09/2025', client: 'Nitu Real Estate', amount: 1600, description: 'Logo Design & Poster Fp' },
    { date: '24/09/2025', client: 'Vishaved Real Estate', amount: 2000, description: 'Logo Design' },
    { date: '25/09/2025', client: 'Swast n Mast', amount: 7500, description: 'Digital Marketing' },
    { date: '26/09/2025', client: 'Yasmeen', amount: 500, description: 'Bag Design' },
    { date: '29/09/2025', client: 'Karad Mart', amount: 5000, description: 'Startup Kit Installment 2' },

    // October 2025
    { date: '01/10/2025', client: 'Kchem Overseas', amount: 10000, description: 'Website & logo Adv.' },
    { date: '02/10/2025', client: 'Muktaa Global', amount: 1000, description: 'Website maintance' },
    { date: '02/10/2025', client: 'Advocate Bahulekar', amount: 5000, description: 'Content creation' },
    { date: '11/10/2025', client: 'Padar', amount: 7000, description: 'Digital Marketing' },
    { date: '15/10/2025', client: 'Pastel Pink', amount: 7500, description: 'Digital Marketing' },
    { date: '15/10/2025', client: 'Viraj Dog house', amount: 800, description: 'Banner Design' },
    { date: '15/10/2025', client: 'Padar', amount: 7500, description: 'Digital Marketing' },
    { date: '17/10/2025', client: 'Swast n Mast', amount: 7500, description: 'Digital Marketing' },
    { date: '18/10/2025', client: 'Pastel Pink', amount: 7500, description: 'Digital Marketing' },
    { date: '19/10/2025', client: 'Vishaved Real Estate', amount: 1200, description: 'Brochure Design' },
    { date: '21/10/2025', client: 'Fashion Point', amount: 15000, description: 'Digital Marketing' },
    { date: '31/10/2025', client: 'Padar', amount: 7000, description: 'Digital Marketing' },

    // November 2025
    { date: '07/11/2025', client: 'Earthly Flavors', amount: 199, description: 'Website Hosting' },
    { date: '08/11/2025', client: 'Viraj Dog house', amount: 400, description: 'Banner Design' },
    { date: '11/11/2025', client: 'Pastel Pink', amount: 10000, description: 'Digital Marketing & Branding' },
    { date: '14/11/2025', client: 'Chandan Shinde', amount: 2000, description: 'Video Production Adv.' },
    { date: '15/11/2025', client: 'Sirang Decoraters', amount: 600, description: 'Banner Design' },
    { date: '11/11/2025', client: 'Pastel Pink', amount: 5000, description: 'Digital Marketing' },
    { date: '18/11/2025', client: 'Sirang Decoraters', amount: 400, description: 'Vector Art Design' },
    { date: '21/11/2025', client: 'Swast n Mast', amount: 7500, description: 'Digital Marketing' },
    { date: '22/11/2025', client: 'Padar', amount: 7500, description: 'Digital Marketing' },
    { date: '24/11/2025', client: 'Pastel Pink', amount: 5000, description: 'Digital Marketing' },
    { date: '27/11/2025', client: 'Bolbo Global', amount: 10000, description: 'Startup Kit Installment 2' },
    { date: '30/11/2025', client: 'Chandan Shinde', amount: 2000, description: 'Video Production Fp' }
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
        // console.log(`Found existing client: ${existing.name} (${existing.id})`);
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
    console.log(`Starting Import for ${rawData.length} entries...`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const entry of rawData) {
        const clientId = await getOrCreateClient(entry.client);

        if (!clientId) {
            console.warn(`Skipping entry for ${entry.client} (Could not resolve ID)`);
            errorCount++;
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
            errorCount++;
            continue;
        }

        if (duplicates && duplicates.length > 0) {
            // console.log(`Duplicate found for ${entry.client} on ${entry.date}. Skipping.`);
            skipCount++;
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
                    status: 'RECEIVED',
                    payment_method: 'bank' // Defaulting to bank 
                },
            ]);

        if (insertError) {
            console.error(`Error inserting entry for ${entry.client}:`, insertError.message);
            errorCount++;
        } else {
            console.log(`Successfully inserted: ${entry.date} - ${entry.client} - ₹${entry.amount}`);
            successCount++;
        }
    }

    console.log(`\nImport Complete.`);
    console.log(`Success: ${successCount}`);
    console.log(`Skipped (Duplicate): ${skipCount}`);
    console.log(`Errors: ${errorCount}`);
}

main().catch(console.error);
