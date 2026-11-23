import { Router } from "express";

import { getSpecialists } from "../controllers/specialists.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePracticeMembership } from "../middleware/membership.middleware.js";

const router = Router();

router.use(requireAuth, requirePracticeMembership);

router.get("/", getSpecialists);

export default router;