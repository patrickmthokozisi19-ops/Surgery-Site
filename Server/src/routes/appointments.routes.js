import { Router } from "express";

import {
  getAppointments,
  getAppointmentById,
  getAppointmentHistory,
  createAppointment,
  updateAppointment
} from "../controllers/appointments.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePracticeMembership } from "../middleware/membership.middleware.js";

const router = Router();

// Every appointment request requires authentication
// and an active hospital membership.
router.use(requireAuth, requirePracticeMembership);

router.get("/", getAppointments);
router.get("/:id/history", getAppointmentHistory);
router.post("/", createAppointment);
router.patch("/:id", updateAppointment);

export default router;