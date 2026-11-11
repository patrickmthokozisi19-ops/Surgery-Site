
import { Router } from "express";

const router = Router();

const appointments = [
  { id: 1, patient: "John", status: "confirmed" },
  { id: 2, patient: "Sarah", status: "pending" }
];

router.get("/", (req, res) => {
  res.json(appointments);
});

router.get("/:id", (req, res) => {
  const id = Number(req.params.id);

  const appointment = appointments.find(
    appointment => appointment.id === id
  );

  if (!appointment) {
    return res.status(404).json({
      message: "Appointment not found"
    });
  }

  res.json(appointment);
});

export default router;
