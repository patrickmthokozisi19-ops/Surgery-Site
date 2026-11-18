
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Public test route
router.get("/", (req, res) => {
  res.json({ message: "Auth route working" });
});

// Protected route
router.get("/me", requireAuth, (req, res) => {
  res.json({
    message: "You are authenticated!",
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

export default router;
