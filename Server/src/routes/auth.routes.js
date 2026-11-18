
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requirePracticeMembership } from "../middleware/membership.middleware.js";

const router = Router();

// Public test route
router.get("/", (req, res) => {
  res.json({ message: "Auth route working" });
});

// Test authentication
router.get("/me", requireAuth, (req, res) => {
  res.json({
    message: "You are authenticated!",
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

// Test hospital membership
router.get(
  "/my-practice",
  requireAuth,
  requirePracticeMembership,
  (req, res) => {
    res.json({
      message: "Hospital membership verified!",
      user: req.user.email,
      practiceId: req.practiceId,
      role: req.practiceRole
    });
  }
);

export default router;
