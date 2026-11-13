
/*
  PWEB — SHARED THEME SYSTEM

  Used by both Admin and Specialist portals.

  Modes:
  - light
  - dark
  - system (follows device appearance)

  Storage key: pweb_theme
*/

(() => {
    "use strict";
  
    const KEY = "pweb_theme";
  
    const systemTheme = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );
  
    // Get saved theme preference
    function getTheme() {
      try {
        const saved = localStorage.getItem(KEY);
  
        return saved === "light" || saved === "dark"
          ? saved
          : "system";
      } catch {
        return "system";
      }
    }
  
    // Apply theme to the HTML element
    function applyTheme() {
      const preference = getTheme();
  
      const effectiveTheme =
        preference === "system"
          ? systemTheme.matches
            ? "dark"
            : "light"
          : preference;
  
      document.documentElement.dataset.theme = effectiveTheme;
  
      // Update theme selection buttons
      document.querySelectorAll("[data-theme-choice]").forEach((button) => {
        const selected =
          button.dataset.themeChoice === preference;
  
        button.setAttribute("aria-pressed", String(selected));
      });
  
      // Update theme status message
      const status = document.getElementById("ss-theme-status");
  
      if (status) {
        status.textContent =
          preference === "system"
            ? `Following device appearance (${effectiveTheme})`
            : `${preference === "dark" ? "Dark" : "Light"} mode selected`;
      }
    }
  
    // Save and change theme
    function setTheme(preference) {
      if (!["light", "dark", "system"].includes(preference)) {
        return;
      }
  
      try {
        if (preference === "system") {
          localStorage.removeItem(KEY);
        } else {
          localStorage.setItem(KEY, preference);
        }
      } catch {
        // Continue applying the theme where possible.
      }
  
      applyTheme();
    }
  
    // Handle theme button clicks
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-theme-choice]");
  
      if (!button) return;
  
      setTheme(button.dataset.themeChoice);
    });
  
    // Respond to device theme changes
    function handleSystemThemeChange() {
      if (getTheme() === "system") {
        applyTheme();
      }
    }
  
    if (typeof systemTheme.addEventListener === "function") {
      systemTheme.addEventListener(
        "change",
        handleSystemThemeChange
      );
    } else {
      systemTheme.addListener(handleSystemThemeChange);
    }
  
    // Synchronise theme changes between browser tabs
    window.addEventListener("storage", (event) => {
      if (event.key === KEY) {
        applyTheme();
      }
    });
  
    // Initialise
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        applyTheme,
        { once: true }
      );
    } else {
      applyTheme();
    }
  })();
  