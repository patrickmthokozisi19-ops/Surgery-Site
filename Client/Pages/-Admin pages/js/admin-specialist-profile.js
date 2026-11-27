
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
  let editing = false;

  // -----------------------------
  // Navigation
  // -----------------------------

  function setupNavigation() {
    const nav = $("dw-nav-links");
    const button = document.querySelector(".adm-doc-nav .burger");

    if (!nav || !button) return;

    button.addEventListener("click", () => {
      const open = nav.classList.toggle("open");

      button.classList.toggle("open", open);

      document.querySelector(".adm-doc-nav")
        ?.classList.toggle("open", open);

      button.setAttribute("aria-expanded", String(open));
    });
  }

  // -----------------------------
  // Profile tabs
  // -----------------------------

  function setupTabs() {
    document.querySelectorAll(".asp-tab").forEach((button) => {
      button.addEventListener("click", () => {
        const selected = button.dataset.tab;

        document.querySelectorAll(".asp-tab").forEach((tab) => {
          const active = tab === button;

          tab.classList.toggle("active", active);
          tab.setAttribute("aria-selected", String(active));
        });

        document.querySelectorAll(".asp-tab-panel").forEach((panel) => {
          panel.hidden = panel.id !== `tab-${selected}`;
        });
      });
    });
  }

  // -----------------------------
  // Load specialist
  // -----------------------------

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

  async function loadSpecialist() {
    const specialistId = new URLSearchParams(
      window.location.search
    ).get("id");

    if (!specialistId) {
      showMessage("No specialist ID was provided.", true);
      $("saveProfile").disabled = true;
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
        throw new Error(result.message || "Could not load specialist.");
      }

      specialist = result;

      credentials =
        specialist.credentials &&
        typeof specialist.credentials === "object" &&
        !Array.isArray(specialist.credentials)
          ? { ...specialist.credentials }
          : {};

      fillProfile();
      setViewMode();

    } catch (error) {
      console.error("Specialist profile error:", error);

      showMessage(
        error.message || "Unable to load specialist profile.",
        true
      );

      $("saveProfile").disabled = true;
    }
  }

  // -----------------------------
  // Populate specialty options
  // -----------------------------

  function setupSpecialties() {
    const select = $("editSpecialty");

    select.replaceChildren();

    SPECIALTIES.forEach((specialty) => {
      const option = document.createElement("option");

      option.value = specialty;
      option.textContent = specialty;

      select.appendChild(option);
    });
  }

  // -----------------------------
  // Fill profile
  // -----------------------------

  function fillProfile() {
    $("profileContent").hidden = false;

    $("specialistNumber").textContent = `· ${specialist.id}`;

    $("profileName").textContent = specialist.full_name;

    $("profileAvatar").textContent = specialist.full_name
      .split(/\s+/)
      .filter(part => !["Dr.", "Dr"].includes(part))
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase();

    $("profileSpecialty").textContent =
      specialist.specialty || "Specialty not specified";

    $("profileAccountBadge").textContent =
      specialist.user_id ? "Account linked" : "No linked account";

    $("profileCredentialBadge").textContent =
      credentials.credential_status || "Not verified";

    setupSpecialties();

    $("editName").value = specialist.full_name || "";

    $("editSpecialty").value =
      specialist.specialty || "";

    $("editEmail").value =
      credentials.email || "";

    $("editPhone").value =
      credentials.phone || "";

    $("editRegistration").value =
      credentials.registration || "";

    $("editNotes").value =
      credentials.administrative_notes || "";

    $("credentialStatus").textContent =
      credentials.credential_status || "Not verified";

    // Availability is not yet connected to the database.
    $("editStatus").disabled = true;
    $("editDuration").disabled = true;

    $("hoursRows").textContent =
      "Working hours integration is not available yet.";

    // Account information.
    $("accountStatus").textContent =
      specialist.user_id ? "Account linked" : "No linked account";

    $("accountDescription").textContent =
      specialist.user_id
        ? "A user account is linked to this specialist record."
        : "No user account is currently linked.";

    $("inviteButton").disabled = true;

    $("viewCalendar").href = "admin-calendar.html";

    showMessage("");
  }

  // -----------------------------
  // View mode
  // -----------------------------

  function setViewMode() {
    editing = false;

    $("profileForm").classList.remove("asp-editing");

    $("editName").disabled = true;
    $("editSpecialty").disabled = true;
    $("editEmail").disabled = true;
    $("editPhone").disabled = true;
    $("editRegistration").disabled = true;
    $("editNotes").disabled = true;

    $("editStatus").disabled = true;
    $("editDuration").disabled = true;

    $("saveProfile").textContent = "Edit profile";
    $("saveProfile").disabled = false;

    $("cancelEdit").hidden = true;
  }

  // -----------------------------
  // Edit mode
  // -----------------------------

  function setEditMode() {
    if (!specialist || editing) return;

    editing = true;

    $("profileForm").classList.add("asp-editing");

    $("editName").disabled = false;
    $("editSpecialty").disabled = false;
    $("editEmail").disabled = false;
    $("editPhone").disabled = false;
    $("editRegistration").disabled = false;
    $("editNotes").disabled = false;

    // These features are not implemented yet.
    $("editStatus").disabled = true;
    $("editDuration").disabled = true;

    $("saveProfile").textContent = "Save changes";
    $("cancelEdit").hidden = false;

    showMessage("You are editing this specialist's profile.");
  }

  // -----------------------------
  // Cancel editing
  // -----------------------------

  function cancelEditing() {
    if (!editing) return;

    fillProfile();
    setViewMode();

    showMessage("Changes discarded.");
  }

  // -----------------------------
  // Save profile
  // -----------------------------

  async function saveProfile(event) {
    event.preventDefault();

    if (!specialist || !editing) return;

    showMessage("");

    const fullName = $("editName").value.trim();
    const email = $("editEmail").value.trim();

    if (!fullName) {
      showMessage("Enter the specialist's full name.", true);
      return;
    }

    if (email && !$("editEmail").validity.valid) {
      showMessage("Enter a valid email address.", true);
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Could not save specialist profile."
        );
      }

      specialist = result.specialist;

      credentials = {
        ...updatedCredentials
      };

      fillProfile();
      setViewMode();

      showMessage("Specialist profile updated successfully.");

    } catch (error) {
      console.error("Specialist save error:", error);

      showMessage(
        error.message || "Unable to save specialist profile.",
        true
      );

      saveButton.disabled = false;
      saveButton.textContent = "Save changes";
    }
  }

  // -----------------------------
  // Feedback
  // -----------------------------

  function showMessage(message, isError = false) {
    const element = $("profileMessage");

    element.textContent = message;
    element.classList.toggle("error", isError);
  }

  // -----------------------------
  // Initialise
  // -----------------------------

  setupNavigation();
  setupTabs();

  $("saveProfile").addEventListener("click", () => {
    if (editing) {
      $("profileForm").requestSubmit();
    } else {
      setEditMode();
    }
  });

  $("cancelEdit").addEventListener("click", cancelEditing);

  $("profileForm").addEventListener("submit", saveProfile);

  loadSpecialist();

})();
