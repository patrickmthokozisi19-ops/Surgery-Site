
import { Router } from "express";
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment
} from "../controllers/appointments.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePracticeMembership } from "../middleware/membership.middleware.js";
const router = Router();

router.get("/", getAppointments);

router.get("/:id", getAppointmentById);

router.post("/", createAppointment);

router.patch("/:id", updateAppointment);

export default router;
