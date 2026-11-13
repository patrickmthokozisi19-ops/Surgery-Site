import {
  AppointmentError,
  parseAppointmentBody,
  validateRegistration,
  validateStatus
} from "./appointments.validation.js";

// Temporary development storage.
// Restarting the server resets these records.
const appointments = [
  {
    id: 1,
    patient: "Thabo Mokoena",
    specialist: "Dr. N. Maseko",
    date: "2026-11-15",
    status: "confirmed"
  },
  {
    id: 2,
    patient: "Sarah Khumalo",
    specialist: "Dr. K. Lewis",
    date: "2026-11-16",
    status: "pending"
  }
];

let nextId = 3;

const copy = (value) => structuredClone(value);

export const findAllAppointments = () => {
  // The table does not need identity or next-of-kin details.
  return appointments.map(({ patientDetails, ...summary }) => {
    return copy(summary);
  });
};

export const findAppointmentById = (id) => {
  const appointment = appointments.find((item) => item.id === id);

  return appointment ? copy(appointment) : null;
};

const assertAvailable = (candidate) => {
  if (
    candidate.status === "cancelled" ||
    !candidate.start ||
    !candidate.end
  ) {
    return;
  }

  const conflict = appointments.some((appointment) => {
    return (
      appointment.id !== candidate.id &&
      appointment.status !== "cancelled" &&
      appointment.specialist === candidate.specialist &&
      appointment.date === candidate.date &&
      appointment.start &&
      appointment.end &&
      candidate.start < appointment.end &&
      appointment.start < candidate.end
    );
  });

  if (conflict) {
    throw new AppointmentError(
      "This specialist already has a booking during the selected time.",
      409
    );
  }
};

export const addAppointment = (body) => {
  const data = parseAppointmentBody(body);

  const appointment = validateRegistration({
    contact: "",
    type: "consult",
    status: "pending",
    notes: "",
    ...data
  });

  assertAvailable(appointment);

  appointment.id = nextId++;

  appointments.push(copy(appointment));

  return copy(appointment);
};

export const updateAppointmentDetails = (id, body) => {
  const index = appointments.findIndex((item) => item.id === id);

  if (index === -1) {
    return null;
  }

  const patch = parseAppointmentBody(body);
  const existing = appointments[index];

  const candidate = {
    ...copy(existing),
    ...patch
  };

  if (patch.patientDetails) {
    candidate.patientDetails = {
      ...existing.patientDetails,
      ...patch.patientDetails
    };
  }

  const statusOnly =
    Object.keys(patch).length === 1 &&
    "status" in patch;

  if (statusOnly) {
    validateStatus(candidate.status);
  } else {
    validateRegistration(candidate);
  }

  assertAvailable(candidate);

  appointments[index] = copy(candidate);

  return copy(candidate);
};

export const changeAppointmentStatus = (id, status) => {
  return updateAppointmentDetails(id, { status });
};