
import { Router } from "express";

import {
  getPatients,
  getPatientById,
  createPatient
} from "../controllers/patients.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePracticeMembership } from "../middleware/membership.middleware.js";

const router = Router();

router.use(requireAuth, requirePracticeMembership);

router.get("/", getPatients);
router.post("/", createPatient);
router.get("/:id", getPatientById);

export default router;
