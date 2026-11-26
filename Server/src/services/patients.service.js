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

// Retrieve one patient by their database ID.
export const findPatientById = async (
  id,
   practiceId,
    userSupabase) =>
    {
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
    .select("id, practice_id, full_name, contact, details, created_at")
    .eq("practice_id", practiceId)
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
