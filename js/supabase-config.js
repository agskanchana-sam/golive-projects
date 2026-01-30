// Supabase Configuration
// Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://hkdoxjjlsrgbxeqefqdz.supabase.co'; // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrZG94ampsc3JnYnhlcWVmcWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNzE3ODEsImV4cCI6MjA2Njk0Nzc4MX0.6CsK7mJyiiXO6c8t2wwlcmp8nlo3_3xOS52PRg4c4a4'; // Found in Project Settings > API

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if Supabase is configured
function isSupabaseConfigured() {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
}

if (!isSupabaseConfigured()) {
    console.warn('⚠️ Supabase is not configured. Please update SUPABASE_URL and SUPABASE_ANON_KEY in js/supabase-config.js');
}
