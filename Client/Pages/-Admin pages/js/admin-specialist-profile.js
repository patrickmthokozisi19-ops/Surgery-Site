
import { supabase } from "./supabase-client.js";

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const SPECIALTIES = [
    "General surgery",
    "Orthopaedics",
    "ENT",
    "Gynaecology",
    "Paediatrics",
    "Urology",
    "Ophthalmology",
    "Neurosurgery",
    "Cardiothoracic surgery",
    "Plastic surgery",
    "Other"
  ];

  let specialist = null;
  let credentials = {};

  // ----------------------------------------
  // Navigation
  // ----------------------------------------

  function setupNavigation() {
    const nav = $("dw-nav-links");
    const button = document.querySelector(".adm-doc-nav .burger");

    if (!nav || !button) return;

    button.addEventListener("click", () => {
      const open = nav.classList.toggle("open");

      button.classList.toggle("open", open);
      document.querySelector(".adm-doc-nav")?.classList.toggle("open", open);
      button.setAttribute("aria-expanded", String(open));
    });
  }

  // ----------------------------------------
  // Authentication
  // ----------------------------------------

  async function getSession() {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error || !session) {
      window.location.replace("./admin-login.html");
      return null;
    }

    return session;
  }

  // ----------------------------------------
  // Profile loading
  // ----------------------------------------

  async function loadSpecialist() {
    const specialistId = new URLSearchParams(
      window.location.search
    ).get("id");

    if (!specialistId) {
      showNotFound("No specialist ID was provided.");
      return;
    }

    try {
      const session = await getSession();
      if (!session) return;

      const response = await fetch(
        `/api/specialists/${encodeURIComponent(specialistId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );

      if (response.status === 401 || response.status === 403) {
        window.location.replace("./admin-login.html");
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Could not load specialist profile."
        );
      }

      specialist = result;

      credentials =
        specialist.credentials &&
        typeof specialist.credentials === "object" &&
        !Array.isArray(specialist.credentials)
          ? { ...specialist.credentials }
          : {};

      renderProfile();
      setupEditDialog();

    } catch (error) {
      console.error("Specialist profile error:", error);
      showNotFound(
        error.message || "Unable to load specialist profile."
      );
    }
  }

  // ----------------------------------------
  // Render profile
  // ----------------------------------------

  function renderProfile() {
    if (!specialist) return;

    const fullName = specialist.full_name || "Unnamed specialist";
    const specialty = specialist.specialty || "Not provided";
    const registration = credentials.registration || "Not provided";
    const email = credentials.email || "Not provided";
    const phone = credentials.phone || "Not provided";
    const notes = credentials.administrative_notes || "No notes available";
    const credentialStatus =
      credentials.credential_status || "Not verified";

    const accountLinked = Boolean(specialist.user_id);

    $("profileContent").hidden = false;
    $("profileNotFound").hidden = true;

    $("breadcrumbName").textContent = fullName;
    $("profileName").textContent = fullName;
    $("specialistNumber").textContent = specialist.id;

    $("profileAvatar").textContent = getInitials(fullName);

    $("profileAccountBadge").textContent = accountLinked
      ? "Account linked"
      : "No linked account";

    $("profileCredentialBadge").textContent = credentialStatus;

    // Professional information

    $("viewName").textContent = fullName;
    $("viewSpecialty").textContent = specialty;
    $("viewRegistration").textContent = registration;
    $("viewEmail").textContent = email;
    $("viewPhone").textContent = phone;
    $("viewNotes").textContent = notes;

    // Account information

    $("accountStatus").textContent = accountLinked
      ? "Account linked"
      : "No linked account";

    $("accountDescription").textContent = accountLinked
      ? "A user account is linked to this specialist record."
      : "There is currently no user account linked to this specialist record.";

    // Overview

    $("overviewSpecialty").textContent = specialty;
    $("overviewCredentials").textContent = credentialStatus;
    $("overviewAccount").textContent = accountLinked
      ? "Linked"
      : "Not linked";

    $("overviewCreated").textContent = formatDate(
      specialist.created_at
    );

    // Calendar

    $("viewCalendar").href = "admin-calendar.html";

    // Update dialog fields

    populateSpecialtyOptions();
  }

  function getInitials(name) {
    return name
      .replace(/\bDr\.?\s*/gi, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }

  function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return new Intl.DateTimeFormat("en-ZA", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  // ----------------------------------------
  // Edit dialog
  // ----------------------------------------

  function populateSpecialtyOptions() {
    const select = $("editSpecialty");

    if (!select) return;

    const currentSpecialty = specialist?.specialty || "";
    const options = [...SPECIALTIES];

    if (
      currentSpecialty &&
      !options.includes(currentSpecialty)
    ) {
      options.push(currentSpecialty);
    }

    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select specialty";
    select.appendChild(placeholder);

    options.forEach((item) => {
      const option = document.createElement("option");
      option.value = item;
      option.textContent = item;
      select.appendChild(option);
    });
  }

  function setupEditDialog() {
    const dialog = $("editDialog");
    const form = $("editForm");

    if (!dialog || !form) return;

    $("editProfile").addEventListener("click", openEditDialog);

    $("closeEdit").addEventListener("click", () => {
      dialog.close();
    });

    $("cancelEdit").addEventListener("click", () => {
      dialog.close();
    });

    form.addEventListener("submit", saveProfile);
  }

  function openEditDialog() {
    if (!specialist) return;

    $("editName").value = specialist.full_name || "";
    $("editSpecialty").value = specialist.specialty || "";
    $("editEmail").value = credentials.email || "";
    $("editPhone").value = credentials.phone || "";
    $("editRegistration").value = credentials.registration || "";
    $("editNotes").value = credentials.administrative_notes || "";

    showMessage("");

    $("editDialog").showModal();
  }

  // ----------------------------------------
  // Save profile
  // ----------------------------------------

  async function saveProfile(event) {
    event.preventDefault();

    if (!specialist) return;

    showMessage("");

    const fullName = $("editName").value.trim();
    const email = $("editEmail").value.trim();

    if (!fullName) {
      showMessage("Enter the specialist's full name.", true);
      $("editName").focus();
      return;
    }

    if (email && !$("editEmail").validity.valid) {
      showMessage("Enter a valid email address.", true);
      $("editEmail").focus();
      return;
    }

    const updatedCredentials = {
      ...credentials,
      email,
      phone: $("editPhone").value.trim(),
      registration: $("editRegistration").value.trim(),
      administrative_notes: $("editNotes").value.trim()
    };

    const saveButton = $("saveProfile");
    const originalText = saveButton.textContent;

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
      const session = await getSession();
      if (!session) return;

      const response = await fetch(
        `/api/specialists/${encodeURIComponent(specialist.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            fullName,
            specialty: $("editSpecialty").value,
            credentials: updatedCredentials
          })
        }
      );

      if (response.status === 401 || response.status === 403) {
        window.location.replace("./admin-login.html");
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Could not save specialist profile."
        );
      }

      if (!result.specialist) {
        throw new Error("The server did not return the updated specialist.");
      }

      specialist = result.specialist;

      credentials =
        specialist.credentials &&
        typeof specialist.credentials === "object" &&
        !Array.isArray(specialist.credentials)
          ? { ...specialist.credentials }
          : {};

      renderProfile();

      $("editDialog").close();

    } catch (error) {
      console.error("Specialist save error:", error);

      showMessage(
        error.message || "Unable to save specialist profile.",
        true
      );

    } finally {
      saveButton.disabled = false;
      saveButton.textContent = originalText;
    }
  }

  // ----------------------------------------
  // Messages and errors
  // ----------------------------------------

  function showMessage(message, isError = false) {
    const element = $("profileMessage");

    if (!element) return;

    element.textContent = message;
    element.classList.toggle("error", isError);
  }

  function showNotFound(message) {
    $("profileContent").hidden = true;
    $("profileNotFound").hidden = false;
    $("profileError").textContent = message;
  }

  // ----------------------------------------
  // Initialise
  // ----------------------------------------

  setupNavigation();
  loadSpecialist();

})();
