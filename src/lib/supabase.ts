import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

if (typeof window !== 'undefined' && (supabaseUrl.includes('placeholder') || supabaseKey === 'placeholder')) {
    console.error('YOUR APP IS BROKEN: Supabase Environment Variables are missing! You must add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel/Netlify project settings.');
    alert('CRITICAL ERROR: Database connection failed. Environment variables are missing. Check console for details.');
}

export const supabase = createClient(supabaseUrl, supabaseKey)
