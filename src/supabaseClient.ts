import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project URL and anon/public key.
// It is recommended to use environment variables for these in a real project (e.g. import.meta.env.VITE_SUPABASE_URL)
const SUPABASE_URL = "https://jniwczfmuzrcbgakhwjf.supabase.co"; // Removed /rest/v1/ as supabase-js handles endpoints natively
const SUPABASE_PUBLIC_KEY = "sb_publishable_trJ0Xe5TqmKbofmDacSVtw_J4Xut0Hx";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
