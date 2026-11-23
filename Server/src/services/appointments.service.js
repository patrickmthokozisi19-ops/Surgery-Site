import {
  AppointmentError,
  parseAppointmentBody,
  validateRegistration,
  validateStatus
} from "./appointments.validation.js";

import {
  findOrCreatePatient
} from "./patients.service.js";

// Convert a database appointment into the format
// your existing frontend expects.
const mapAppointment = (row) => {
  const patient = row.patients;

  return {
    id: Number(row.id),
    patient: patient?.full_name || "",
    patientId: row.patient_id,
    specialist: row.specialist,
    specialistId: row.specialist_id,
    contact: patient?.contact || "",
    type: row.visit_type,
    status: row.status,
    date: row.appointment_date,
    start: row.start_time,
    end: row.end_time,
    notes: row.notes,
    patientDetails: patient?.details || {}
  };
};
/*
-The specialist actually exists.
-The specialist belongs to the practice making the booking.*/

const findPracticeSpecialist = async (
  specialistId,
  practiceId,
  userSupabase
) => {
  const { data, error } = await userSupabase
    .from("specialists")
    .select("id, full_name")
    .eq("id", specialistId)
    .eq("practice_id", practiceId)
    .maybeSingle();

  if (error) handleDatabaseError(error);

  if (!data) {
    throw new AppointmentError(
      "The selected specialist does not belong to this practice.",
      400
    );
  }

  return data;
};
// Convert PostgreSQL overlap errors into API conflicts.
const handleDatabaseError = (error) => {
  if (error.code === "23P01") {
    throw new AppointmentError(
      "This specialist already has a booking during the selected time.",
      409
    );
  }

  console.error("Appointment database error:", error);

  throw new AppointmentError(
    "Unable to process the appointment.",
    500
  );
};

// Retrieve appointments belonging to one hospital.
export const findAllAppointments = async (practiceId, userSupabase) => {
  const { data, error } = await userSupabase
    .from("appointments")
    .select(`
      id,
      patient_id,
      specialist,
      specialist_id,
      visit_type,
      status,
      appointment_date,
      start_time,
      end_time,
      notes,
      patients!appointment_patient_same_practice (
        full_name,
        contact
      )
    `)
    .eq("practice_id", practiceId)
    .order("appointment_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) handleDatabaseError(error);

  return data.map((row) => {
    const appointment = mapAppointment(row);
    delete appointment.patientDetails;
    return appointment;
  });
};

// Retrieve one appointment, including its patient details.
export const findAppointmentById = async (
  id,
  practiceId,
  userSupabase
) => {
  const { data, error } = await userSupabase
    .from("appointments")
    .select(`
      id,
      patient_id,
      specialist,
      specialist_id,
      visit_type,
      status,
      appointment_date,
      start_time,
      end_time,
      notes,
      patients!appointment_patient_same_practice (
        full_name,
        contact,
        details
      )
    `)
    .eq("id", id)
    .eq("practice_id", practiceId)
    .maybeSingle();

  if (error) handleDatabaseError(error);

  return data ? mapAppointment(data) : null;
};

// Create a new appointment.
export const addAppointment = async (
  body,
  practiceId,
  userSupabase
) => {
  const data = parseAppointmentBody(body);

  const appointment = validateRegistration({
    contact: "",
    type: "consult",
    status: "pending",
    notes: "",
    ...data
  });
// Verify the specialist belongs to this practice.
const specialist = await findPracticeSpecialist(
  appointment.specialistId,
  practiceId,
  userSupabase
);
  // Create or retrieve the patient first.
  const patient = await findOrCreatePatient({
    practiceId,
    patient: appointment.patient,
    contact: appointment.contact,
    patientDetails: appointment.patientDetails,
    userSupabase
  });

  // Supabase generates the appointment ID.
  const { data: savedAppointment, error } = await userSupabase
    .from("appointments")
    .insert({
      practice_id: practiceId,
      patient_id: patient.id,
      specialist_id: specialist.id,
      specialist: specialist.full_name,
      visit_type: appointment.type,
      status: appointment.status,
      appointment_date: appointment.date,
      start_time: appointment.start,
      end_time: appointment.end,
      notes: appointment.notes
    })
    .select(`
      id,
      patient_id,
      specialist,
      specialist_id,
      visit_type,
      status,
      appointment_date,
      start_time,
      end_time,
      notes,
      patients!appointment_patient_same_practice (
        full_name,
        contact,
        details
      )
    `)
    .single();

  if (error) handleDatabaseError(error);

  return mapAppointment(savedAppointment);
};

// Update an existing appointment.
export const updateAppointmentDetails = async (
  id,
  body,
  practiceId,
  userSupabase
) => {
  const patch = parseAppointmentBody(body);

  const existing = await findAppointmentById(
    id,
    practiceId,
    userSupabase
  );

  if (!existing) return null;

  const candidate = {
    ...existing,
    ...patch,
    patientDetails: {
      ...existing.patientDetails,
      ...(patch.patientDetails || {})
    }
  };

  const statusOnly =
    Object.keys(patch).length === 1 &&
    "status" in patch;

  if (statusOnly) {
    validateStatus(candidate.status);
  } else {
    validateRegistration(candidate);
  }

  // Update patient information when the request includes it.
  const patientChanged =
    "patient" in patch ||
    "contact" in patch ||
    "patientDetails" in patch;

  if (patientChanged) {
    const { error: patientError } = await userSupabase
      .from("patients")
      .update({
        full_name: candidate.patient,
        contact: candidate.contact,
        details: candidate.patientDetails
      })
      .eq("id", existing.patientId)
      .eq("practice_id", practiceId);

    if (patientError) handleDatabaseError(patientError);
  }

  const { data, error } = await userSupabase
    .from("appointments")
    .update({
      specialist: candidate.specialist,
      visit_type: candidate.type,
      status: candidate.status,
      appointment_date: candidate.date,
      start_time: candidate.start,
      end_time: candidate.end,
      notes: candidate.notes
    })
    .eq("id", id)
    .eq("practice_id", practiceId)
    .select(`
      id,
      patient_id,
      specialist,
      visit_type,
      status,
      appointment_date,
      start_time,
      end_time,
      notes,
      patients!appointment_patient_same_practice (
        full_name,
        contact,
        details
      )
    `)
    .maybeSingle();

  if (error) handleDatabaseError(error);

  return data ? mapAppointment(data) : null;
};

export const changeAppointmentStatus = async (
  id,
  status,
  practiceId,
  userSupabase
) => {
  return updateAppointmentDetails(
    id,
    { status },
    practiceId,
    userSupabase
  );
};