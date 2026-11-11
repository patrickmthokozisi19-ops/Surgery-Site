
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json([
    { id: 1, name: "John Doe" },
    { id: 2, name: "Sarah Smith" }
  ]);
});

export default router;
