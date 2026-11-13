(() => {
  /*
   * This wrapper keeps our variables inside this script.
   * They will not accidentally clash with other page scripts.
   */
  "use strict";

  /* =========================================================
     1. SETTINGS AND LABELS
     ========================================================= */

  // Vite forwards requests beginning with /api to Express.
  const API_URL = "/api/appointments";

  // Maximum number of bookings displayed on one table page.
  const PAGE_SIZE = 8;

  // Temporary specialist list until we connect a specialists API.
  const SPECIALISTS = [
    "Dr. P. Surname",
    "Dr. N. Maseko",
    "Dr. K. Lewis"
  ];

  // The keys are values stored by the API.
  // The values are readable labels shown to the user.
  const STATUS_LABELS = {
    pending: "Pending",
    confirmed: "Confirmed",
    "checked-in": "Checked in",
    completed: "Completed",
    cancelled: "Cancelled"
  };

  const TYPE_LABELS = {
    consult: "Consultation",
    followup: "Follow-up",
    procedure: "Procedure",
    results: "Results review"
  };

  /*
   * These names match the IDs of the patient-detail inputs.
   *
   * They also become the keys inside patientDetails when we
   * send a booking to the backend.
   */
  const PROFILE_FIELDS = [
    "preferredName",
    "birthDate",
    "idType",
    "identityNumber",
    "language",
    "contactOwner",
    "patientEmail",
    "alternativePhone",
    "address",
    "postalCode",
    "contactMethod",
    "emergencyName",
    "emergencyRelationship",
    "emergencyPhone",
    "kinSame",
    "kinName",
    "kinRelationship",
    "kinPhone",
    "guardianNeeded",
    "guardianName",
    "guardianRelationship",
    "guardianPhone",
    "paymentMethod",
    "payerName",
    "payerPhone",
    "scheme",
    "plan",
    "memberNumber",
    "dependantCode",
    "mainMember",
    "authorisation"
  ];

  // Shortcut: $("patientName") finds the element with that ID.
  const $ = (id) => document.getElementById(id);

  /* =========================================================
     2. PAGE STATE
     ========================================================= */

  /*
   * State describes what the page currently knows:
   * - bookings received from the API
   * - selected filters
   * - current table page
   * - booking being edited
   * - whether a request is in progress
   *
   * This is frontend state, not permanent database storage.
   */
  const state = {
    bookings: [],
    search: "",
    status: "all",
    specialist: "all",
    date: "",
    tab: "all",
    page: 1,

    // null means we are creating a new booking.
    editingId: null,

    // Prevent repeated saves while a request is running.
    saving: false,

    // Prevent repeated Edit requests while opening a booking.
    opening: false
  };

  // Used to cancel the previous toast's disappearance timer.
  let toastTimer;

  /* =========================================================
     3. SMALL HELPER FUNCTIONS
     ========================================================= */

  function today() {
    /*
     * Use the South African date even if the browser's
     * timezone is set to another country.
     *
     * en-CA produces the YYYY-MM-DD format used by date inputs.
     */
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Johannesburg",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  }

  function escapeHTML(value) {
    /*
     * Some table content is inserted using innerHTML.
     *
     * Escape special characters so a patient's name or other
     * value is displayed as text rather than interpreted as HTML.
     */
    return String(value ?? "").replace(
      /[&<>"']/g,
      (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]
    );
  }

  function displayDate(value) {
    // Turn a stored date such as 2026-11-15 into a readable date.
    if (!value) return "Date not recorded";

    /*
     * Parse and display using UTC consistently.
     * This prevents a date-only value shifting to the previous day
     * because of a timezone conversion.
     */
    const date = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-ZA", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function normalizeBooking(item) {
    /*
     * Convert API records into the shape our interface expects.
     *
     * The backend uses "specialist".
     * Existing table code uses "doctor".
     *
     * HTML data attributes contain strings, so converting IDs
     * to strings prevents comparisons such as 1 !== "1".
     */
    return {
      ...item,
      id: String(item.id),
      patient: item.patient || "",
      doctor: item.specialist || item.doctor || "",
      contact: item.contact || "",
      date: item.date || "",
      start: item.start || "",
      end: item.end || "",
      type: item.type || "consult",
      status: item.status || "pending",
      notes: item.notes || ""
    };
  }

  function toast(message) {
    // Show a short notification at the bottom of the page.
    const element = $("bookingToast");

    element.textContent = message;
    element.classList.add("is-visible");

    // Restart the timer whenever a new notification appears.
    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      element.classList.remove("is-visible");
    }, 4500);
  }

  /* =========================================================
     4. COMMUNICATION WITH THE BACKEND
     ========================================================= */

  async function apiRequest(path = "", options = {}) {
    /*
     * A shared request function avoids repeating fetch setup.
     *
     * Examples:
     * apiRequest()              -> GET /api/appointments
     * apiRequest("/3")          -> GET /api/appointments/3
     * apiRequest("", options)   -> POST when options.method is POST
     */
    const headers = new Headers(options.headers);

    // Tell the API that we expect JSON in its response.
    headers.set("Accept", "application/json");

    // Only describe the request body as JSON when there is a body.
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers
    });

    const contentType =
      response.headers.get("content-type") || "";

    /*
     * A broken proxy can return an HTML page.
     * Detect that before trying to parse it as JSON.
     */
    if (!contentType.includes("application/json")) {
      throw new Error(
        "The API did not return JSON. Check that Express is running and the Vite proxy is configured."
      );
    }

    // Convert JSON response text into a JavaScript value.
    const data = await response.json();

    /*
     * fetch does not automatically throw for HTTP errors such as
     * 400, 404 or 409, so we check response.ok ourselves.
     */
    if (!response.ok) {
      throw new Error(
        data.message || `Request failed (${response.status}).`
      );
    }

    return data;
  }

  function addSpecialist(name) {
    // Add a specialist to both dropdowns without duplicating options.
    if (!name) return;

    for (const id of [
      "specialistFilter",
      "bookingSpecialist"
    ]) {
      const select = $(id);

      const exists = [...select.options].some(
        (option) => option.value === name
      );

      if (!exists) {
        select.add(new Option(name, name));
      }
    }
  }

  async function loadBookings() {
    // Get the latest appointment summaries from Express.
    const data = await apiRequest();

    if (!Array.isArray(data)) {
      throw new Error(
        "The API must return an appointments array."
      );
    }

    // Normalize every record before the interface uses it.
    state.bookings = data.map(normalizeBooking);

    // Include specialist names found in the returned appointments.
    state.bookings.forEach((booking) => {
      addSpecialist(booking.doctor);
    });

    render();
  }

  /* =========================================================
     5. FILTERING AND TABLE CONTENT
     ========================================================= */

  function filteredBookings() {
    const query = state.search.toLowerCase();
    const currentDate = today();

    return state.bookings
      .filter((booking) => {
        /*
         * Returning false removes a booking from these results.
         * The original state.bookings array stays unchanged.
         */
        if (
          state.status !== "all" &&
          booking.status !== state.status
        ) {
          return false;
        }

        if (
          state.specialist !== "all" &&
          booking.doctor !== state.specialist
        ) {
          return false;
        }

        if (
          state.date &&
          booking.date !== state.date
        ) {
          return false;
        }

        if (
          state.tab === "today" &&
          booking.date !== currentDate
        ) {
          return false;
        }

        if (
          state.tab === "upcoming" &&
          (
            booking.date < currentDate ||
            ["cancelled", "completed"].includes(booking.status)
          )
        ) {
          return false;
        }

        if (
          state.tab === "pending" &&
          booking.status !== "pending"
        ) {
          return false;
        }

        // A booking matches if any searchable value contains the query.
        return [
          booking.patient,
          booking.doctor,
          booking.id,
          TYPE_LABELS[booking.type] || booking.type
        ].some((value) => {
          return String(value)
            .toLowerCase()
            .includes(query);
        });
      })
      .sort((a, b) => {
        /*
         * YYYY-MM-DD and HH:MM strings sort chronologically
         * when they use consistent zero-padded formatting.
         *
         * Compare times only when both bookings have the same date.
         */
        return (
          a.date.localeCompare(b.date) ||
          a.start.localeCompare(b.start)
        );
      });
  }

  function actionButtons(booking) {
    const actions = [];

    // Show the next workflow action for the current status.
    if (booking.status === "pending") {
      actions.push(
        '<button type="button" data-action="confirm">Confirm</button>'
      );
    }

    if (booking.status === "confirmed") {
      actions.push(
        '<button type="button" data-action="checkin">Check in</button>'
      );
    }

    if (booking.status === "checked-in") {
      actions.push(
        '<button type="button" data-action="complete">Complete</button>'
      );
    }

    // Editing remains available regardless of status.
    actions.push(
      '<button type="button" data-action="edit">Edit</button>'
    );

    return `
      <div class="ab-row-actions">
        ${actions.join("")}
      </div>
    `;
  }

  function render() {
    /*
     * Render means updating the visible page using current state.
     * This function does not send requests or save anything.
     */
    const currentDate = today();

    // Overview cards use all loaded bookings, before table filters.
    $("totalCount").textContent = state.bookings.length;

    $("pendingCount").textContent = state.bookings.filter(
      (booking) => booking.status === "pending"
    ).length;

    $("todayCount").textContent = state.bookings.filter(
      (booking) =>
        booking.date === currentDate &&
        booking.status !== "cancelled"
    ).length;

    $("checkedCount").textContent = state.bookings.filter(
      (booking) =>
        booking.date === currentDate &&
        booking.status === "checked-in"
    ).length;

    const bookings = filteredBookings();

    // Keep at least one page, even when there are no results.
    const pages = Math.max(
      1,
      Math.ceil(bookings.length / PAGE_SIZE)
    );

    // Keep the current page inside the available page range.
    state.page = Math.max(
      1,
      Math.min(state.page, pages)
    );

    // slice selects only the records for the current page.
    const start = (state.page - 1) * PAGE_SIZE;
    const visible = bookings.slice(
      start,
      start + PAGE_SIZE
    );

    $("bookingRows").innerHTML = visible.map((booking) => {
      const time = booking.start
        ? booking.start + (
            booking.end ? ` – ${booking.end}` : ""
          )
        : "Time not recorded";

      // Only known status values are used to construct CSS classes.
      const knownStatus = Object.hasOwn(
        STATUS_LABELS,
        booking.status
      );

      const statusClass = knownStatus
        ? `ab-status-${booking.status}`
        : "";

      return `
        <tr data-id="${escapeHTML(booking.id)}">
          <td>
            <strong>${escapeHTML(booking.patient)}</strong>
            <small>${escapeHTML(booking.id)}</small>
          </td>

          <td>${escapeHTML(booking.doctor)}</td>

          <td>
            <strong>
              ${escapeHTML(displayDate(booking.date))}
            </strong>

            <small>${escapeHTML(time)}</small>
          </td>

          <td>
            ${escapeHTML(
              TYPE_LABELS[booking.type] || booking.type
            )}
          </td>

          <td>
            <span class="ab-status ${statusClass}">
              ${escapeHTML(
                STATUS_LABELS[booking.status] || booking.status
              )}
            </span>
          </td>

          <td>${actionButtons(booking)}</td>
        </tr>
      `;
    }).join("");

    // Update empty state and pagination information.
    $("emptyState").hidden = bookings.length > 0;

    $("resultCount").textContent =
      `(${bookings.length})`;

    $("rangeLabel").textContent = bookings.length
      ? `Showing ${start + 1}–${Math.min(
          start + PAGE_SIZE,
          bookings.length
        )} of ${bookings.length}`
      : "Showing 0 bookings";

    $("pageLabel").textContent =
      `${state.page} / ${pages}`;

    $("prevPage").disabled = state.page === 1;
    $("nextPage").disabled = state.page === pages;
  }

  function resetPageAndRender() {
    /*
     * A filter change may reduce the number of pages.
     * Return to page 1 before displaying the new results.
     */
    state.page = 1;
    render();
  }

  /* =========================================================
     6. CONDITIONAL FORM SECTIONS
     ========================================================= */

  function syncSections() {
    /*
     * Some sections only apply to certain patients:
     * - separate next-of-kin fields
     * - guardian details
     * - medical aid details
     */
    const groups = [
      {
        id: "kinFields",
        visible: $("kinSame").value === "no",
        required: []
      },
      {
        id: "guardianFields",
        visible: $("guardianNeeded").value === "yes",
        required: [
          "guardianName",
          "guardianRelationship",
          "guardianPhone"
        ]
      },
      {
        id: "medicalAidFields",
        visible: $("paymentMethod").value === "medical-aid",
        required: [
          "scheme",
          "memberNumber",
          "dependantCode",
          "mainMember"
        ]
      }
    ];

    for (const group of groups) {
      const section = $(group.id);

      section.hidden = !group.visible;

      section
        .querySelectorAll("input, select, textarea")
        .forEach((input) => {
          /*
           * Hidden inputs are disabled so browser validation
           * does not demand answers in invisible sections.
           */
          input.disabled = !group.visible;

          input.required =
            group.visible &&
            group.required.includes(input.id);
        });
    }

    // Identification can be unavailable.
    const hasIdentification =
      $("idType").value !== "unavailable";

    $("identityNumber").disabled = !hasIdentification;
    $("identityNumber").required = hasIdentification;

    // An email address is necessary when email contact is selected.
    $("patientEmail").required =
      $("contactMethod").value === "email";
  }

  /* =========================================================
     7. OPENING AND CLOSING THE FORM
     ========================================================= */

  async function openDialog(id = null) {
    if (state.saving || state.opening) return;

    state.opening = true;

    try {
      let booking = null;

      if (id !== null) {
        /*
         * The table endpoint returns summaries.
         * Fetch the full record when someone clicks Edit.
         */
        booking = normalizeBooking(
          await apiRequest(`/${encodeURIComponent(id)}`)
        );
      }

      state.editingId = id;

      /*
       * Clear the previous patient's answers before filling
       * another booking. This prevents details carrying over.
       */
      $("bookingForm").reset();
      $("formError").textContent = "";

      $("bookingDialogTitle").textContent = booking
        ? `Edit booking · ${booking.id}`
        : "New booking";

      // Optional chaining handles the new-booking case.
      $("patientName").value =
        booking?.patient || "";

      $("patientContact").value =
        booking?.contact || "";

      $("visitType").value =
        booking?.type || "consult";

      addSpecialist(booking?.doctor);

      $("bookingSpecialist").value =
        booking?.doctor || SPECIALISTS[0];

      $("bookingStatus").value =
        booking?.status || "pending";

      $("bookingDate").value =
        booking?.date || today();

      $("bookingStart").value =
        booking?.start || "09:00";

      $("bookingEnd").value =
        booking?.end || "09:45";

      $("bookingNotes").value =
        booking?.notes || "";

      const details = booking?.patientDetails || {};

      // Populate the expanded registration fields.
      for (const field of PROFILE_FIELDS) {
        if (details[field] !== undefined) {
          $(field).value = details[field];
        }
      }

      syncSections();

      /*
       * showModal opens the native dialog above the page.
       * Its ::backdrop CSS creates the background blur.
       */
      $("bookingDialog").showModal();
      $("patientName").focus();
    } catch (error) {
      toast(`Unable to open booking: ${error.message}`);
    } finally {
      // Always release the opening lock, including after errors.
      state.opening = false;
    }
  }

  function closeDialog() {
    // Do not close while the server is processing a save.
    if (state.saving) return;

    $("bookingDialog").close();
    state.editingId = null;
  }

  /* =========================================================
     8. BASIC FRONTEND VALIDATION
     ========================================================= */

  function validateForm() {
    /*
     * These checks give immediate feedback.
     * The backend also validates requests independently.
     */
    const birthDate = $("birthDate").value;
    const currentDate = today();

    if (
      birthDate < "1900-01-01" ||
      birthDate > currentDate
    ) {
      return "Enter a valid date of birth between 1900 and today.";
    }

    // Calculate age, adjusting if this year's birthday is still ahead.
    let age =
      Number(currentDate.slice(0, 4)) -
      Number(birthDate.slice(0, 4));

    if (currentDate.slice(5) < birthDate.slice(5)) {
      age--;
    }

    if (
      age < 18 &&
      $("guardianNeeded").value !== "yes"
    ) {
      return "Select guardian details applicable and complete the guardian details for a patient under 18.";
    }

    if (
      $("bookingEnd").value <= $("bookingStart").value
    ) {
      return "End time must be later than start time.";
    }

    // An empty string means these checks passed.
    return "";
  }

  /* =========================================================
     9. CREATING AND EDITING BOOKINGS
     ========================================================= */

  async function saveForm(event) {
    /*
     * Stop the browser's normal form submission.
     * We send JSON using fetch instead of reloading the page.
     */
    event.preventDefault();

    if (state.saving) return;

    $("formError").textContent = "";

    syncSections();

    /*
     * Run built-in HTML checks such as:
     * - required fields
     * - email format
     * - date limits
     */
    if (!$("bookingForm").reportValidity()) {
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      $("formError").textContent = validationError;
      return;
    }

    const id = state.editingId;
    const patientDetails = {};

    for (const field of PROFILE_FIELDS) {
      /*
       * Do not submit old values from a section that no
       * longer applies, such as medical aid after selecting self-pay.
       */
      patientDetails[field] = $(field).disabled
        ? ""
        : $(field).value.trim();
    }

    /*
     * This object is the request body expected by Express.
     * Send "specialist", matching the backend field name.
     */
    const booking = {
      patient: $("patientName").value.trim(),
      specialist: $("bookingSpecialist").value,
      contact: $("patientContact").value.trim(),
      type: $("visitType").value,
      status: $("bookingStatus").value,
      date: $("bookingDate").value,
      start: $("bookingStart").value,
      end: $("bookingEnd").value,
      notes: $("bookingNotes").value.trim(),
      patientDetails
    };

    const buttons = [
      $("bookingForm").querySelector('[type="submit"]'),
      $("closeDialog"),
      $("cancelDialog")
    ];

    // Lock save and close buttons until the request finishes.
    state.saving = true;

    buttons.forEach((button) => {
      button.disabled = true;
    });

    try {
      /*
       * A new booking uses POST /api/appointments.
       * An existing booking uses PATCH /api/appointments/:id.
       *
       * JSON.stringify converts our JavaScript object to JSON text.
       */
      const saved = await apiRequest(
        id !== null ? `/${encodeURIComponent(id)}` : "",
        {
          method: id !== null ? "PATCH" : "POST",
          body: JSON.stringify(booking)
        }
      );

      /*
       * Catch an older backend that accepts a booking but
       * ignores the newly added patientDetails fields.
       */
      if (
        !saved.patientDetails ||
        saved.patientDetails.birthDate !== patientDetails.birthDate
      ) {
        $("formError").textContent =
          "The API did not return the patient details. Check that all backend files were updated. A booking may already have been created.";

        return;
      }

      state.saving = false;
      closeDialog();

      /*
       * The save has succeeded at this point.
       * A later refresh failure must not be reported as a failed save.
       */
      try {
        await loadBookings();

        toast(
          id !== null
            ? "Booking updated."
            : "Booking saved."
        );
      } catch (error) {
        toast(
          "Booking saved, but the table could not refresh. Reload the page."
        );
      }
    } catch (error) {
      // Includes validation and overlap messages from the backend.
      $("formError").textContent = error.message;
    } finally {
      // Restore the buttons whether the save succeeded or failed.
      state.saving = false;

      buttons.forEach((button) => {
        button.disabled = false;
      });
    }
  }

  async function updateStatus(id, status) {
    if (state.saving) return;

    state.saving = true;

    try {
      /*
       * Status buttons send only the status.
       * They do not need to resubmit the patient registration.
       */
      await apiRequest(`/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });

      try {
        await loadBookings();

        toast(
          `Booking marked ${STATUS_LABELS[status].toLowerCase()}.`
        );
      } catch (error) {
        toast(
          "Status saved, but the table could not refresh. Reload the page."
        );
      }
    } catch (error) {
      toast(`Could not update booking: ${error.message}`);
    } finally {
      state.saving = false;
    }
  }

  /* =========================================================
     10. CSV EXPORT
     ========================================================= */

  function exportCSV() {
    /*
     * Export the filtered results across all pages.
     * Identity numbers and next-of-kin details are excluded.
     */
    const headings = [
      "Reference",
      "Patient",
      "Specialist",
      "Date",
      "Start",
      "End",
      "Visit",
      "Status"
    ];

    const rows = filteredBookings().map((booking) => [
      booking.id,
      booking.patient,
      booking.doctor,
      booking.date,
      booking.start,
      booking.end,
      TYPE_LABELS[booking.type] || booking.type,
      STATUS_LABELS[booking.status] || booking.status
    ]);

    function csvCell(value) {
      let text = String(value ?? "");

      /*
       * Prefix formula-like values so spreadsheet software
       * does not interpret them as executable formulas.
       */
      if (/^\s*[=+@-]|^[\t\r\n]/.test(text)) {
        text = "'" + text;
      }

      // CSV escapes a quotation mark by doubling it.
      return `"${text.replace(/"/g, '""')}"`;
    }

    const csv = [headings, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    /*
     * A Blob holds the generated file in browser memory.
     * The temporary URL lets an anchor download it.
     */
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8;"
      })
    );

    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `pweb-bookings-${today()}.csv`;

    document.body.append(anchor);
    anchor.click();
    anchor.remove();

    // Release the temporary file URL after starting the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* =========================================================
     11. PAGE INITIALISATION AND EVENT LISTENERS
     ========================================================= */

  function init() {
    // Populate specialist dropdowns.
    SPECIALISTS.forEach(addSpecialist);

    // No delete endpoint exists in the current backend.
    if ($("deleteBooking")) {
      $("deleteBooking").hidden = true;
    }

    $("birthDate").min = "1900-01-01";
    $("birthDate").max = today();

    // Show/hide related sections when these selections change.
    for (const id of [
      "kinSame",
      "guardianNeeded",
      "paymentMethod",
      "idType",
      "contactMethod"
    ]) {
      $(id).addEventListener("change", syncSections);
    }

    // Filter as the user types.
    $("bookingSearch").addEventListener("input", (event) => {
      state.search = event.target.value.trim();
      resetPageAndRender();
    });

    // Connect each dropdown/date input to its state property.
    for (const [id, property] of [
      ["statusFilter", "status"],
      ["specialistFilter", "specialist"],
      ["dateFilter", "date"]
    ]) {
      $(id).addEventListener("change", (event) => {
        state[property] = event.target.value;
        resetPageAndRender();
      });
    }

    $("clearFilters").addEventListener("click", () => {
      $("bookingSearch").value = "";
      $("statusFilter").value = "all";
      $("specialistFilter").value = "all";
      $("dateFilter").value = "";

      Object.assign(state, {
        search: "",
        status: "all",
        specialist: "all",
        date: "",
        tab: "all",
        page: 1
      });

      document.querySelectorAll("[data-tab]")
        .forEach((button) => {
          const active = button.dataset.tab === "all";

          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", String(active));
        });

      render();
    });

    // Connect the All / Today / Upcoming / Pending tabs.
    document.querySelectorAll("[data-tab]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          state.tab = button.dataset.tab;

          document.querySelectorAll("[data-tab]")
            .forEach((item) => {
              const active = item === button;

              item.classList.toggle("is-active", active);
              item.setAttribute("aria-pressed", String(active));
            });

          resetPageAndRender();
        });
      });

    /*
     * Event delegation:
     * Listen on the table body instead of attaching a listener
     * separately to every row button.
     *
     * This still works after render replaces the rows.
     */
    $("bookingRows").addEventListener("click", (event) => {
      const button = event.target.closest(
        "button[data-action]"
      );

      if (!button) return;

      // Read the booking ID from its surrounding table row.
      const id = button.closest("tr")?.dataset.id;

      if (!id) return;

      const action = button.dataset.action;

      if (action === "edit") {
        openDialog(id);
        return;
      }

      const statuses = {
        confirm: "confirmed",
        checkin: "checked-in",
        complete: "completed"
      };

      if (statuses[action]) {
        updateStatus(id, statuses[action]);
      }
    });

    $("createBooking").addEventListener("click", () => {
      openDialog();
    });

    // Make the navigation's New booking link open this form.
    const navBooking = document.querySelector(
      ".bnavLinks .navBtn"
    );

    navBooking?.addEventListener("click", (event) => {
      event.preventDefault();
      openDialog();
    });

    $("closeDialog").addEventListener("click", closeDialog);
    $("cancelDialog").addEventListener("click", closeDialog);
    $("bookingForm").addEventListener("submit", saveForm);

    /*
     * Escape normally closes a native dialog.
     * Prevent that while a save is being processed.
     */
    $("bookingDialog").addEventListener("cancel", (event) => {
      if (state.saving) {
        event.preventDefault();
      }
    });

    $("exportBookings").addEventListener("click", exportCSV);

    $("prevPage").addEventListener("click", () => {
      state.page--;
      render();
    });

    $("nextPage").addEventListener("click", () => {
      state.page++;
      render();
    });

    // Mobile navigation menu.
    const burger = document.querySelector(
      ".adm-doc-nav .burger"
    );

    const nav = $("dw-nav-links");

    if (burger && nav) {
      burger.addEventListener("click", () => {
        const open = nav.classList.toggle("open");

        burger.classList.toggle("open", open);

        document.querySelector(".adm-doc-nav")
          .classList.toggle("open", open);

        burger.setAttribute("aria-expanded", String(open));
      });
    }

    // Prepare the initial interface, then request the bookings.
    syncSections();
    render();

    loadBookings().catch((error) => {
      toast(`Unable to load bookings: ${error.message}`);
    });
  }

  /*
   * Start the page.
   * This script belongs below the HTML so its elements exist
   * before init tries to find them.
   */
  init();
})();