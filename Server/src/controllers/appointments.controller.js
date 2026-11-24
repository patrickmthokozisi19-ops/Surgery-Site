
import {
  findAllAppointments,
  findAppointmentById,
  findAppointmentHistory,
  addAppointment,
  updateAppointmentDetails
} from "../services/appointments.service.js";

import {
  AppointmentError
} from "../services/appointments.validation.js";

const parseId = (value) => {
  if (
    !/^[1-9]\d*$/.test(value) ||
    !Number.isSafeInteger(Number(value))
  ) {
    throw new AppointmentError(
      "Appointment ID must be a positive whole number."
    );
  }

  return Number(value);
};

// Handles both synchronous and asynchronous errors.
const handle = (action) => {
  return async (req, res, next) => {
    try {
      await action(req, res);
    } catch (error) {
      if (error instanceof AppointmentError) {
        return res.status(error.status).json({
          message: error.message
        });
      }

      next(error);
    }
  };
};

export const getAppointments = handle(async (req, res) => {
  const appointments = await findAllAppointments(
    req.practiceId,
    req.userSupabase
  );

  res.status(200).json(appointments);
});

export const getAppointmentById = handle(async (req, res) => {
  const id = parseId(req.params.id);

  const appointment = await findAppointmentById(
    id,
    req.practiceId,
    req.userSupabase
  );

  if (!appointment) {
    return res.status(404).json({
      message: "Appointment not found"
    });
  }

  res.status(200).json(appointment);
});

export const createAppointment = handle(async (req, res) => {
  const appointment = await addAppointment(
    req.body,
    req.practiceId,
    req.userSupabase,
    req.practiceTimezone
  );

  res.status(201).json(appointment);
});

export const updateAppointment = handle(async (req, res) => {
  const id = parseId(req.params.id);

  const appointment = await updateAppointmentDetails(
    id,
    req.body,
    req.practiceId,
    req.userSupabase,
    req.practiceTimezone
  );

  if (!appointment) {
    return res.status(404).json({
      message: "Appointment not found"
    });
  }

  res.status(200).json(appointment);
});

export const getAppointmentHistory = handle(async (req, res) => {
  const id = parseId(req.params.id);

  // Confirm that this appointment belongs to the current practice.
  const appointment = await findAppointmentById(
    id,
    req.practiceId,
    req.userSupabase
  );

  if (!appointment) {
    return res.status(404).json({
      message: "Appointment not found"
    });
  }

  const history = await findAppointmentHistory(
    id,
    req.practiceId,
    req.userSupabase
  );

  res.status(200).json(history);
});