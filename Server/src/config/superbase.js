// Load variables from Server/.env.
// Run backend commands from the Server folder.
import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;

// Stop with a clear message if configuration is missing.
if (!url || !key) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in Server/.env"
  );
}

// Create a client for communicating with Supabase over HTTPS.
export const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});