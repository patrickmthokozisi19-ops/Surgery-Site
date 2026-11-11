
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json([
    { id: 1, name: "Dr. Maseko" },
    { id: 2, name: "Dr. Lewis" }
  ]);
});

export default router;
