import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMilestoneLabels() {
    console.log("🔍 Checking Income entries linked to Retainers...");

    // 1. Get all income entries that have a retainer_instance_id
    const { data: entries, error } = await supabase
        .from('income')
        .select('id, description, milestone_label, retainer_instance_id')
        .not('retainer_instance_id', 'is', null);

    if (error) {
        console.error("Error fetching data:", error);
        return;
    }

    if (!entries) {
        console.log("No retainer income entries found.");
        return;
    }

    console.log(`Found ${entries.length} income entries linked to retainers.`);

    const missingLabel = entries.filter((e: any) => !e.milestone_label);
    const hasLabel = entries.filter((e: any) => e.milestone_label);

    console.log(`✅ Entries with milestone_label: ${hasLabel.length}`);
    console.log(`❌ Entries WITHOUT milestone_label: ${missingLabel.length}`);

    if (missingLabel.length > 0) {
        console.log("\nExamples of missing labels:");
        missingLabel.slice(0, 5).forEach((e: any) => {
            console.log(`- ID: ${e.id}, Desc: "${e.description}"`);
        });
    }
}

verifyMilestoneLabels();
