import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// These are Supabase browser-safe project credentials. They are intentionally
// public; access control is enforced by Supabase Auth + Row Level Security.
const SUPABASE_URL = "https://xaaerrvvcfrwtggzwmjh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nCXiLeksPC9xxVFls-54sQ_5b3TD7t3";

let client: SupabaseClient | null = null;

export function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
