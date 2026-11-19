
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing frontend Supabase configuration.");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const passwordToggle = document.getElementById("passwordToggle");
const rememberMe = document.getElementById("rememberMe");

const signInButton = document.getElementById("signInButton");
const formMessage = document.getElementById("formMessage");
const forgotPassword = document.getElementById("forgotPassword");


// =========================================
// FORM FEEDBACK
// =========================================

function showMessage(message, type = "error") {
  formMessage.textContent = message;
  formMessage.className = `form-message show ${type}`;
}

function clearMessage() {
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

function setLoading(loading) {
  signInButton.disabled = loading;

  signInButton.querySelector(".button-text").textContent =
    loading ? "Signing in..." : "Sign In";
}


// =========================================
// PASSWORD VISIBILITY
// =========================================

passwordToggle.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";

  passwordInput.type = isHidden ? "text" : "password";

  passwordToggle.setAttribute(
    "aria-label",
    isHidden ? "Hide password" : "Show password"
  );

  passwordToggle.setAttribute(
    "aria-pressed",
    String(isHidden)
  );
});


// =========================================
// EMAIL REMEMBERING
// =========================================

const savedEmail = localStorage.getItem("pweb_admin_email");

if (savedEmail) {
  emailInput.value = savedEmail;
  rememberMe.checked = true;
}


// =========================================
// FORM VALIDATION
// =========================================

function validateForm() {
  let valid = true;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  document.getElementById("emailError").textContent = "";
  document.getElementById("passwordError").textContent = "";

  if (!email || !emailInput.validity.valid) {
    document.getElementById("emailError").textContent =
      "Enter a valid email address.";

    valid = false;
  }

  if (!password) {
    document.getElementById("passwordError").textContent =
      "Enter your password.";

    valid = false;
  }

  return valid;
}


// =========================================
// ADMIN SIGN IN
// =========================================

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearMessage();

  if (!validateForm()) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  setLoading(true);

  try {

    // 1. Authenticate with Supabase.

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw new Error("Incorrect email or password.");
    }

    const accessToken = data.session.access_token;

    // 2. Ask Express to verify hospital membership.

    const response = await fetch("/api/auth/my-practice", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const responseText = await response.text();

    console.log("API status:", response.status);
    console.log("API response:", responseText);
    
    let membership;
    
    try {
      membership = JSON.parse(responseText);
    } catch {
      throw new Error("The membership endpoint returned HTML instead of JSON.");
    }

    if (!response.ok) {
      throw new Error(
        membership.message || "Hospital membership verification failed."
      );
    }

    // 3. Only administrators may enter the admin workspace.

    if (membership.role !== "admin") {
      throw new Error(
        "This account does not have administrator access."
      );
    }

    // 4. Remember the email if requested.

    if (rememberMe.checked) {
      localStorage.setItem("pweb_admin_email", email);
    } else {
      localStorage.removeItem("pweb_admin_email");
    }

    // 5. Continue to the admin workspace.

    window.location.href = "admin-home.html";

  } catch (error) {

    console.error("Admin sign-in error:", error);

    // Do not leave an authenticated but unauthorised session active.
    await supabase.auth.signOut();

    showMessage(error.message);

  } finally {
    setLoading(false);
  }
});


// =========================================
// PASSWORD RECOVERY
// =========================================

forgotPassword.addEventListener("click", async (event) => {
  event.preventDefault();

  clearMessage();

  const email = emailInput.value.trim();

  if (!email || !emailInput.validity.valid) {
    showMessage("Enter your email address first.");
    emailInput.focus();
    return;
  }

  try {

    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) throw error;

    showMessage(
      "If an account exists for this address, password recovery instructions will be sent.",
      "success"
    );

  } catch (error) {
    showMessage(error.message);
  }
});
