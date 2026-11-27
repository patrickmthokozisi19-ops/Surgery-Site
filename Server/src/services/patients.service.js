import { AppointmentError } from "./appointments.validation.js";

// Fields that should be stored in the patient's details JSONB column.
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

// Select only the profile fields we recognise.
const extractPatientDetails = (details = {}) => {
  return Object.fromEntries(
    PROFILE_FIELDS
      .filter((field) => details[field] !== undefined)
      .map((field) => [field, details[field]])
  );
};

// Normalise contact numbers for consistent matching.
const normaliseContact = (contact) => {
  return String(contact || "").replace(/\s+/g, "").trim();
};

// Find an existing patient or create a new one.
export const findOrCreatePatient = async ({
  practiceId,
  patient,
  contact,
  patientDetails = {},
  userSupabase
}) => {
  if (!practiceId) {
    throw new AppointmentError(
      "Hospital identification is missing."
    );
  }

  if (!patient || !contact) {
    throw new AppointmentError(
      "Patient name and contact number are required."
    );
  }

  const cleanName = patient.trim();
  const cleanContact = normaliseContact(contact);
  const details = extractPatientDetails(patientDetails);

  // Look for an existing patient within this hospital.
  const { data: existingPatients, error: searchError } =
    await userSupabase
      .from("patients")
      .select("id, practice_id, full_name, contact, details")
      .eq("practice_id", practiceId)
      .eq("contact", cleanContact)
      .ilike("full_name", cleanName)
      .limit(2);

  if (searchError) {
    throw new AppointmentError(
      "Unable to search for the patient.",
      500
    );
  }

  if (existingPatients?.length > 1) {
    throw new AppointmentError(
      "Multiple matching patient records were found. Please contact the hospital.",
      409
    );
  }

  if (existingPatients?.length === 1) {
    const existing = existingPatients[0];

    // Update the patient's details with newly supplied information.
    const { data: updatedPatient, error: updateError } =
      await userSupabase
        .from("patients")
        .update({
          details: {
            ...existing.details,
            ...details
          }
        })
        .eq("id", existing.id)
        .eq("practice_id", practiceId)
        .select("id, practice_id, full_name, contact, details")
        .single();

    if (updateError) {
      throw new AppointmentError(
        "Unable to update the patient record.",
        500
      );
    }

    return updatedPatient;
  }

  // No existing patient found: create a new record.
  const { data: newPatient, error: insertError } =
    await userSupabase
      .from("patients")
      .insert({
        practice_id: practiceId,
        full_name: cleanName,
        contact: cleanContact,
        details
      })
      .select("id, practice_id, full_name, contact, details")
      .single();

  if (insertError) {
    throw new AppointmentError(
      "Unable to register the patient.",
      500
    );
  }

  return newPatient;
};

export const registerPatient = async ({
  practiceId,
  patient,
  contact,
  patientDetails = {},
  userSupabase
}) => {
  if (!practiceId) {
    throw new AppointmentError(
      "Hospital identification is missing."
    );
  }

  if (!patient?.trim() || !contact?.trim()) {
    throw new AppointmentError(
      "Patient name and contact number are required."
    );
  }

  const cleanName = patient.trim();
  const cleanContact = normaliseContact(contact);
  const details = extractPatientDetails(patientDetails);

  // Prevent accidental duplicate registrations.
  const { data: existing, error: searchError } =
    await userSupabase
      .from("patients")
      .select("id")
      .eq("practice_id", practiceId)
      .eq("contact", cleanContact)
      .ilike("full_name", cleanName)
      .limit(1);

  if (searchError) {
    throw new AppointmentError(
      "Unable to check existing patient records.",
      500
    );
  }

  if (existing?.length) {
    throw new AppointmentError(
      "This patient is already registered at this practice.",
      409
    );
  }

  // Create the patient with default account and verification statuses.
  const { data: newPatient, error: insertError } =
    await userSupabase
      .from("patients")
      .insert({
        practice_id: practiceId,
        full_name: cleanName,
        contact: cleanContact,
        details,
        status: "active",
        verification_status: "not_uploaded"
      })
      .select(`
        id,
        practice_id,
        full_name,
        contact,
        details,
        status,
        verification_status,
        created_at
      `)
      .single();

  if (insertError) {
    console.error("Patient registration failed:", insertError);

    throw new AppointmentError(
      "Unable to register the patient.",
      500
    );
  }

  return newPatient;
};

// Update an existing patient's profile.
export const updatePatient = async ({
  id,
  practiceId,
  patient,
  contact,
  patientDetails = {},
  status,
  userSupabase
}) => {
  if (!practiceId) {
    throw new AppointmentError("Hospital identification is missing.");
  }

  if (!id) {
    throw new AppointmentError("Patient identification is missing.");
  }

  // Retrieve the existing record within the current practice.
  const { data: existing, error: findError } = await userSupabase
    .from("patients")
    .select("id, practice_id, full_name, contact, details, status")
    .eq("id", id)
    .eq("practice_id", practiceId)
    .maybeSingle();

  if (findError) {
    throw new AppointmentError("Unable to retrieve the patient.", 500);
  }

  if (!existing) {
    throw new AppointmentError("Patient not found.", 404);
  }

  const updates = {};

  // Update the patient's name only when supplied.
  if (patient !== undefined) {
    if (typeof patient !== "string" || !patient.trim()) {
      throw new AppointmentError("Patient name is required.");
    }

    updates.full_name = patient.trim();
  }

  // Update the contact number only when supplied.
  if (contact !== undefined) {
    const cleanContact = normaliseContact(contact);

    if (!cleanContact) {
      throw new AppointmentError("Patient contact number is required.");
    }

    updates.contact = cleanContact;
  }

  // Validate status when it is supplied.
  if (status !== undefined) {
    const cleanStatus = String(status).toLowerCase();

    if (!["active", "inactive"].includes(cleanStatus)) {
      throw new AppointmentError("Invalid patient status.");
    }

    updates.status = cleanStatus;
  }

  // Keep existing JSONB details and update only recognised fields.
  const cleanDetails = extractPatientDetails(patientDetails);

  if (Object.keys(cleanDetails).length > 0) {
    updates.details = {
      ...(existing.details || {}),
      ...cleanDetails
    };
  }

  if (Object.keys(updates).length === 0) {
    throw new AppointmentError("No patient information was supplied.");
  }

  // Prevent another patient at this practice from having the same
  // name and contact combination.
  const updatedName = updates.full_name ?? existing.full_name;
  const updatedContact = updates.contact ?? existing.contact;

  if (updates.full_name !== undefined || updates.contact !== undefined) {
    const { data: duplicate, error: duplicateError } = await userSupabase
      .from("patients")
      .select("id")
      .eq("practice_id", practiceId)
      .eq("contact", updatedContact)
      .ilike("full_name", updatedName)
      .neq("id", id)
      .limit(1);

    if (duplicateError) {
      throw new AppointmentError(
        "Unable to check for duplicate patient records.",
        500
      );
    }

    if (duplicate?.length) {
      throw new AppointmentError(
        "Another patient at this practice already has this name and contact number.",
        409
      );
    }
  }

  const { data: updatedPatient, error: updateError } = await userSupabase
    .from("patients")
    .update(updates)
    .eq("id", id)
    .eq("practice_id", practiceId)
    .select(`
      id,
      practice_id,
      full_name,
      contact,
      details,
      status,
      verification_status,
      created_at
    `)
    .single();

  if (updateError) {
    console.error("Patient update failed:", updateError);

    throw new AppointmentError(
      "Unable to update the patient record.",
      500
    );
  }

  return updatedPatient;
};


// Retrieve one patient by their database ID.
export const findPatientById = async (
  id,
  practiceId,
  userSupabase) => {
  const { data, error } = await userSupabase
    .from("patients")
    .select("id, practice_id, full_name, contact, details")
    .eq("id", id)
    .eq("practice_id", practiceId)
    .maybeSingle();

  if (error) {
    throw new AppointmentError(
      "Unable to retrieve the patient.",
      500
    );
  }

  return data;
};

// Retrieve all patients belonging to the current practice.
export const findAllPatients = async (practiceId, userSupabase) => {
  const { data, error } = await userSupabase
    .from("patients")
    .select(`
    id,
    practice_id,
    full_name,
    contact,
    details,
    status,
    verification_status,
    created_at
  `).eq("practice_id", practiceId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Unable to retrieve patients:", error);

    throw new AppointmentError(
      "Unable to retrieve patient records.",
      500
    );
  }

  return data;
};
