
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// Always load the .env file from the Server folder.
const envPath = fileURLToPath(
  new URL("../../.env", import.meta.url)
);

dotenv.config({ path: envPath });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in Server/.env"
  );
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});
