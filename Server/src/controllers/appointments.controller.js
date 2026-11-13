import {
  findAllAppointments,
  findAppointmentById,
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

const handle = (action) => {
  return (req, res, next) => {
    try {
      action(req, res);
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

export const getAppointments = handle((req, res) => {
  res.status(200).json(findAllAppointments());
});

export const getAppointmentById = handle((req, res) => {
  const id = parseId(req.params.id);
  const appointment = findAppointmentById(id);

  if (!appointment) {
    return res.status(404).json({
      message: "Appointment not found"
    });
  }

  res.status(200).json(appointment);
});

export const createAppointment = handle((req, res) => {
  const appointment = addAppointment(req.body);

  res.status(201).json(appointment);
});

export const updateAppointment = handle((req, res) => {
  const id = parseId(req.params.id);

  const appointment = updateAppointmentDetails(
    id,
    req.body
  );

  if (!appointment) {
    return res.status(404).json({
      message: "Appointment not found"
    });
  }

  res.status(200).json(appointment);
});