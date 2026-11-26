
import {
    findAllPatients,
    findPatientById,
    registerPatient
  } from "../services/patients.service.js";
  
  const handle = (callback) => async (req, res, next) => {
    try {
      await callback(req, res, next);
    } catch (error) {
      next(error);
    }
  };
  
  // GET all patients belonging to the current practice.
  export const getPatients = handle(async (req, res) => {
    const patients = await findAllPatients(
      req.practiceId,
      req.userSupabase
    );
  
    res.status(200).json(patients);
  });
  
  // GET one patient by database ID.
  export const getPatientById = handle(async (req, res) => {
    const id = req.params.id;
  
    const patient = await findPatientById(
      id,
      req.practiceId,
      req.userSupabase
    );
  
    if (!patient) {
      return res.status(404).json({
        message: "Patient not found."
      });
    }
  
    res.status(200).json(patient);
  });
  
export const createPatient = handle(async (req, res) => {
  const {
    patient,
    contact,
    patientDetails = {}
  } = req.body;

  const newPatient = await registerPatient({
    practiceId: req.practiceId,
    patient,
    contact,
    patientDetails,
    userSupabase: req.userSupabase
  });

  res.status(201).json({
    message: "Patient registered successfully.",
    patient: newPatient
  });
});
