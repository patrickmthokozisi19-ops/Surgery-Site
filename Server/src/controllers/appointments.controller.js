
import {
  findAllAppointments,
  findAppointmentById,
  addAppointment,
  changeAppointmentStatus
} from "../services/appointments.service.js";

export const getAppointments = (req, res) => {
  res.status(200).json(findAllAppointments());
};

export const getAppointmentById = (req, res) => {
  const id = Number(req.params.id);

  const appointment = findAppointmentById(id);

  if (!appointment) {
    return res.status(404).json({
      message: "Appointment not found"
    });
  }

  res.status(200).json(appointment);
};

export const createAppointment = (req, res) => {
  const { patient, specialist, date } = req.body ?? {};

  if (!patient || !specialist || !date) {
    return res.status(400).json({
      message: "Patient, specialist and date are required"
    });
  }

  const appointment = addAppointment({
    patient,
    specialist,
    date
  });

  res.status(201).json(appointment);
};

export const updateAppointment = (req, res) => {
  const id = Number(req.params.id);
  const status = req.body?.status;

  const allowedStatuses = [
    "pending",
    "confirmed",
    "checked-in",
    "completed",
    "cancelled"
  ];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: "Invalid appointment status"
    });
  }

  const appointment = changeAppointmentStatus(id, status);

  if (!appointment) {
    return res.status(404).json({
      message: "Appointment not found"
    });
  }

  res.status(200).json(appointment);
};
