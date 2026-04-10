import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes('your-project')) {
  throw new Error("Supabase URL is missing! Please add VITE_SUPABASE_URL to your Vercel Environment Variables and Redeploy.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
