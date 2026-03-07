const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://uxxrxnzrdscjvjfrlirb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4eHJ4bnpyZHNjanZqZnJsaXJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNjE0MTYsImV4cCI6MjA4NDkzNzQxNn0.L69S-9CxG-M38wJuPy9nooL6vrujqPPy9u-Xehi5GUM');

async function test() {
  const { data, error } = await supabase.from('expenses').select('expense_type').limit(1);
  console.log('--- OUTPUT ---');
  console.log('Error:', error);
  console.log('Data:', data);
  console.log('--------------');
}
test().catch(console.error);
