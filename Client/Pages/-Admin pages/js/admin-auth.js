
import { supabase } from "./supabase-client.js";
//temp
await supabase.auth.signOut();
async function protectAdminPage() {
  try {
    // 1. Check whether a Supabase session exists.
    const { data: { session }, error } =
      await supabase.auth.getSession();

    if (error || !session) {
      window.location.replace("./admin-login.html");
      return;
    }

    // 2. Verify the user's hospital membership.
    const response = await fetch("/api/auth/my-practice", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    const membership = await response.json();

    if (!response.ok || membership.role !== "admin") {
      await supabase.auth.signOut();
      window.location.replace("./admin-login.html");
      return;
    }

    // 3. Allow the admin page to become visible.
    document.documentElement.classList.add("auth-ready");

  } catch (error) {
    console.error("Admin authentication error:", error);

    // Fail closed if authentication cannot be verified.
    document.documentElement.classList.add("auth-error");
  }
}

protectAdminPage();
