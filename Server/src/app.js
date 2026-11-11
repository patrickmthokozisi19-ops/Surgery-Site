
import express from "express";

import appointmentRoutes from "./routes/appointments.routes.js";
import patientRoutes from "./routes/patients.routes.js";
import specialistRoutes from "./routes/specialists.routes.js";
import hospitalRoutes from "./routes/hospitals.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Pweb API is running" });
});

app.use("/api/appointments", appointmentRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/specialists", specialistRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/auth", authRoutes);

export default app;
