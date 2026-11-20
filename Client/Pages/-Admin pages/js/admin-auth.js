
import { supabase } from "./supabase-client.js";

async function protectAdminPage() {
  try {
    // 1. Check Supabase session.
    const { data: { session }, error } =
      await supabase.auth.getSession();

    if (error || !session) {
      window.location.replace("./admin-login.html");
      return;
    }

    // 2. Verify hospital membership.
    const response = await fetch("/api/auth/my-practice", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      await supabase.auth.signOut();
      window.location.replace("./admin-login.html");
      return;
    }

    const membership = await response.json();

    if (membership.role !== "admin") {
      await supabase.auth.signOut();
      window.location.replace("./admin-login.html");
      return;
    }

    // 3. Reveal the page after successful verification.
    document.documentElement.classList.add("auth-ready");

  } catch (error) {
    console.error("Admin authentication error:", error);
    window.location.replace("./admin-login.html");
  }
}

protectAdminPage();
