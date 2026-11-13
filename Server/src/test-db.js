import { supabase } from "./config/supabase.js";

async function testConnection() {
  // Ask Supabase for practice records.
  const { data, error } = await supabase
    .from("practices")
    .select("id, name")
    .limit(1);

  if (error) {
    console.error("Database request failed:", error.message);
    process.exitCode = 1;
    return;
  }

  console.log("Supabase database API connection works.");
  console.log("Visible practices:", data);
}

testConnection().catch((error) => {
  console.error("Connection test failed:", error.message);
  process.exitCode = 1;
});