import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run() {
  const { data: contracts } = await supabase.from('retainer_contracts').select('id, name').ilike('name', '%Earthly Flavours%');
  if(!contracts || contracts.length === 0) { console.log("No contract found"); return; }
  const c = contracts[0];
  console.log("Contract:", c.name);
  const { data: versions } = await supabase.from('contract_versions').select('id, effective_start_date').eq('contract_id', c.id);
  const vIds = versions.map(v=>v.id);
  const { data: instances } = await supabase.from('monthly_instances').select('*').in('contract_version_id', vIds).order('month_date');
  console.log("Instances:\n", instances.map(i => `${i.id} | ${i.month_date} | ${i.status} | ${i.total_due}`).join('\n'));
  const { data: incomes } = await supabase.from('income').select('id, retainer_instance_id, amount').in('retainer_instance_id', instances.map(i=>i.id));
  console.log("\nIncomes:\n", incomes.map(i => `${i.retainer_instance_id} | ${i.amount}`).join('\n'));
}
run();
