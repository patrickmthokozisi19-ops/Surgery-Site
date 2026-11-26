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
// Retrieve appointments belonging to one patient
// within the current practice.
export const findAppointmentsByPatient = async (
  patientId,
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
        contact
      )
    `)
    .eq("patient_id", patientId)
    .eq("practice_id", practiceId)
    .order("appointment_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error) handleDatabaseError(error);

  return data.map(mapAppointment).map((appointment) => {
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
  userSupabase,
  practiceTimezone
) => {
  const data = parseAppointmentBody(body);

  const appointment = validateRegistration({
    contact: "",
    type: "consult",
    status: "pending",
    notes: "",
    ...data
  }, practiceTimezone);
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
  userSupabase,
  practiceTimezone
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
      const scheduleChanged =
        candidate.date !== existing.date ||
        candidate.start !== existing.start;
    
      validateRegistration(
        candidate,
        practiceTimezone,
        { requireFuture: scheduleChanged }
      );
    
      const specialist = await findPracticeSpecialist(
        candidate.specialistId,
        practiceId,
        userSupabase
      );
    
      candidate.specialist = specialist.full_name;
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
    //when an appointment is edited, its specialist UUID is updated too
    .update({
      specialist_id: candidate.specialistId,
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

export const findAppointmentHistory = async (
  appointmentId,
  practiceId,
  userSupabase
) => {
  // Retrieve the appointment history.
  const { data: history, error } = await userSupabase
    .from("appointment_status_history")
    .select(`
      id,
      appointment_id,
      old_status,
      new_status,
      changed_by,
      changed_at
    `)
    .eq("appointment_id", appointmentId)
    .eq("practice_id", practiceId)
    .order("changed_at", { ascending: false });

  if (error) {
    console.error("Could not retrieve appointment history:", error);
    throw new AppointmentError(
      "Could not retrieve appointment history.",
      500
    );
  }

  // Collect the unique user UUIDs.
  const actorIds = [
    ...new Set(
      history
        .map((item) => item.changed_by)
        .filter(Boolean)
    )
  ];

  if (actorIds.length === 0) {
    return history.map((item) => ({
      ...item,
      actor_name: null,
      actor_role: null
    }));
  }

  // Retrieve their profiles and practice roles.
  const [profilesResult, membershipsResult] = await Promise.all([
    userSupabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", actorIds),

    userSupabase
      .from("practice_memberships")
      .select("user_id, role")
      .eq("practice_id", practiceId)
      .eq("active", true)
      .in("user_id", actorIds)
  ]);

  if (profilesResult.error || membershipsResult.error) {
    console.error(
      "Could not retrieve history actor details:",
      profilesResult.error || membershipsResult.error
    );

    throw new AppointmentError(
      "Could not retrieve appointment history details.",
      500
    );
  }

  const profilesById = new Map(
    profilesResult.data.map((profile) => [
      profile.id,
      `${profile.first_name} ${profile.last_name}`
    ])
  );

  const rolesById = new Map(
    membershipsResult.data.map((membership) => [
      membership.user_id,
      membership.role
    ])
  );

  // Attach identity information without changing the original UUID.
  return history.map((item) => ({
    ...item,
    actor_name: profilesById.get(item.changed_by) || null,
    actor_role: rolesById.get(item.changed_by) || null
  }));
};
export const findAppointmentHistoryForExport = async (
  appointmentIds,
  practiceId,
  userSupabase
) => {
  if (!Array.isArray(appointmentIds) || appointmentIds.length === 0) {
    return [];
  }

  // Remove duplicate IDs.
  const uniqueIds = [...new Set(appointmentIds)];

  // Confirm that all requested appointments belong to this practice.
  const { data: appointments, error: appointmentError } =
    await userSupabase
      .from("appointments")
      .select("id")
      .eq("practice_id", practiceId)
      .in("id", uniqueIds);

  if (appointmentError) {
    console.error("Could not verify export appointments:", appointmentError);
    throw new AppointmentError(
      "Could not verify appointments for audit export.",
      500
    );
  }

  const validIds = appointments.map((item) => item.id);

  if (validIds.length !== uniqueIds.length) {
    throw new AppointmentError(
      "One or more appointments could not be found.",
      404
    );
  }

  // Retrieve all history records for the verified appointments.
  const { data: history, error } = await userSupabase
    .from("appointment_status_history")
    .select(`
      id,
      appointment_id,
      old_status,
      new_status,
      changed_by,
      changed_at
    `)
    .eq("practice_id", practiceId)
    .in("appointment_id", validIds)
    .order("changed_at", { ascending: false });

  if (error) {
    console.error("Could not retrieve export history:", error);
    throw new AppointmentError(
      "Could not retrieve audit history.",
      500
    );
  }

  // Collect actor UUIDs.
  const actorIds = [
    ...new Set(
      history
        .map((item) => item.changed_by)
        .filter(Boolean)
    )
  ];

  if (actorIds.length === 0) {
    return history.map((item) => ({
      ...item,
      actor_name: null,
      actor_role: null
    }));
  }

  // Retrieve actor profiles and roles.
  const [profilesResult, membershipsResult] = await Promise.all([
    userSupabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", actorIds),

    userSupabase
      .from("practice_memberships")
      .select("user_id, role")
      .eq("practice_id", practiceId)
      .eq("active", true)
      .in("user_id", actorIds)
  ]);

  if (profilesResult.error || membershipsResult.error) {
    console.error(
      "Could not retrieve audit actor details:",
      profilesResult.error || membershipsResult.error
    );

    throw new AppointmentError(
      "Could not retrieve audit actor details.",
      500
    );
  }

  const profilesById = new Map(
    profilesResult.data.map((profile) => [
      profile.id,
      `${profile.first_name} ${profile.last_name}`
    ])
  );

  const rolesById = new Map(
    membershipsResult.data.map((membership) => [
      membership.user_id,
      membership.role
    ])
  );

  return history.map((item) => ({
    ...item,
    actor_name: profilesById.get(item.changed_by) || null,
    actor_role: rolesById.get(item.changed_by) || null
  }));
};